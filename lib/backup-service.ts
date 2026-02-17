import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { db, Book, Sale, Expense } from './db';

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

export async function createBackup(): Promise<BackupResult> {
  try {
    const { books, sales, expenses } = await db.getRawData();
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

    const salesHeader = ['id', 'bookId', 'bookName', 'qty', 'totalAmount', 'profit', 'date'];
    const salesRows = sales.map(s => [
      s.id, s.bookId, s.bookName || '', s.qty || 0,
      s.totalAmount || 0, s.profit || 0, s.date || '',
    ]);
    const salesWs = XLSX.utils.aoa_to_sheet([salesHeader, ...salesRows]);
    salesWs['!cols'] = salesHeader.map(() => ({ wch: 16 }));
    XLSX.utils.book_append_sheet(wb, salesWs, 'Sales');

    const expensesHeader = ['id', 'type', 'amount', 'description', 'date'];
    const expensesRows = expenses.map(e => [
      e.id, e.type || '', e.amount || 0, e.description || '', e.date || '',
    ]);
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

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });

    const fileName = `BookInventory_Backup_${formatDate(new Date())}.xlsx`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { success: true, filePath, fileName, message: 'Backup created successfully' };
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
