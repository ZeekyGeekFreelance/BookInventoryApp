import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { db } from './db';

export interface BackupResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  message: string;
}

function formatDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}

function formatSplitDate(isoString: string): { date: string; time: string } {
  if (!isoString) return { date: '', time: '' };
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, '0');

  const dateStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

  return { date: dateStr, time: timeStr };
}

export async function createBackup(): Promise<BackupResult> {
  try {
    const { books, sales, expenses, restocks } = await db.getRawData();
    const stats = await db.getDashboardStats();
    const lowStockBooks = await db.getLowStockBooks();

    const wb = XLSX.utils.book_new();

    const summaryData = [
      ['Book Inventory Backup Summary'],
      ['Generated', new Date().toLocaleString()],
      [''],
      ['Metric', 'Value'],
      ['Total Books', stats.totalBooks],
      ['Total Stock', stats.totalStock],
      ['Stock Value', stats.stockValue],
      ['Total Sales Revenue', stats.totalSales],
      ['Gross Profit', stats.grossProfit],
      ['Total Expenses', stats.totalExpenses],
      ['Net Profit', stats.netProfit],
      ['Profit Margin %', Math.round(stats.profitMargin * 100) / 100],
      ['Total Transactions', stats.totalTransactions],
      ['Low Stock Count', stats.lowStockCount],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [{ wch: 22 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');

    const booksHeader = ['id', 'name', 'author', 'isbn', 'costPrice', 'sellPrice', 'stock', 'targetStock'];
    const booksRows = books.map(b => [
      b.id, b.name || '', b.author || '', b.isbn || '',
      b.costPrice || 0, b.sellPrice || 0, b.stock || 0, b.targetStock || 5,
    ]);
    const booksWs = XLSX.utils.aoa_to_sheet([booksHeader, ...booksRows]);
    booksWs['!cols'] = booksHeader.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, booksWs, 'Books');

    const salesHeader = ['id', 'bookId', 'bookName', 'qty', 'totalAmount', 'profit', 'Date', 'Time'];
    const salesRows = sales.map(s => {
      const { date, time } = formatSplitDate(s.date || '');
      return [
        s.id, s.bookId, s.bookName || '', s.qty || 0,
        s.totalAmount || 0, s.profit || 0, date, time
      ];
    });
    const salesWs = XLSX.utils.aoa_to_sheet([salesHeader, ...salesRows]);
    salesWs['!cols'] = salesHeader.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, salesWs, 'Sales');

    const expensesHeader = ['id', 'type', 'amount', 'description', 'Date', 'Time'];
    const expensesRows = expenses.map(e => {
      const { date, time } = formatSplitDate(e.date || '');
      return [
        e.id, e.type || '', e.amount || 0, e.description || '', date, time
      ];
    });
    const expensesWs = XLSX.utils.aoa_to_sheet([expensesHeader, ...expensesRows]);
    expensesWs['!cols'] = expensesHeader.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, expensesWs, 'Expenses');

    const lowStockHeader = ['name', 'author', 'stock', 'targetStock', 'needed'];
    const lowStockRows = lowStockBooks.map(b => [
      b.name || '', b.author || '', b.stock || 0,
      b.targetStock || 5, Math.max(0, (b.targetStock || 5) - (b.stock || 0)),
    ]);
    const lowStockWs = XLSX.utils.aoa_to_sheet([lowStockHeader, ...lowStockRows]);
    lowStockWs['!cols'] = lowStockHeader.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, lowStockWs, 'Low Stock');

    const restocksHeader = ['id', 'bookId', 'bookName', 'qtyAdded', 'Date', 'Time'];
    const restocksRows = restocks.map(r => {
      const { date, time } = formatSplitDate(r.date || '');
      return [
        r.id, r.bookId, r.bookName || '', r.qtyAdded || 0, date, time
      ];
    });
    const restocksWs = XLSX.utils.aoa_to_sheet([restocksHeader, ...restocksRows]);
    restocksWs['!cols'] = restocksHeader.map(() => ({ wch: 18 }));
    XLSX.utils.book_append_sheet(wb, restocksWs, 'Restocks');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const fileName = `BookInventory_Backup_${formatDate(new Date())}.xlsx`;

    const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;

    // Try SAF for Android first
    if (Platform.OS === 'android' && FileSystem.StorageAccessFramework) {
      try {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            fileName,
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
          await FileSystem.writeAsStringAsync(fileUri, wbout, { encoding: 'base64' });
          return { success: true, filePath: fileUri, fileName, message: 'Backup saved to selected folder' };
        }
      } catch (safError) {
        console.warn('SAF failed, falling back to Sharing:', safError);
      }
    }

    if (Platform.OS !== 'web' && baseDir) {
      const filePath = `${baseDir}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, wbout, {
        encoding: 'base64',
      });
      return { success: true, filePath, fileName, message: 'Backup created successfully' };
    }

    try {
      XLSX.writeFile(wb, fileName);
      return { success: true, fileName, message: 'Backup downloaded successfully' };
    } catch (e: any) {
      throw new Error(`Storage unavailable and Web download failed.`);
    }
  } catch (error: any) {
    return {
      success: false,
      message: `Backup failed: ${error?.message || 'Unknown error'}`,
    };
  }
}

export async function shareBackup(filePath: string): Promise<{ success: boolean; message: string }> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, message: 'Sharing is not available on this device' };
    }
    await Sharing.shareAsync(filePath, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Share Backup File',
    });
    return { success: true, message: 'Backup shared successfully' };
  } catch (error: any) {
    return { success: false, message: `Share failed: ${error?.message || 'Unknown error'}` };
  }
}
