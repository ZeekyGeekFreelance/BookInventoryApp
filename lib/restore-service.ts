import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';
import { db, Book, Sale, Expense } from './db';

export interface RestoreResult {
  success: boolean;
  imported?: {
    books: { added: number };
    sales: { added: number };
    expenses: { added: number };
  };
  errors: string[];
  message: string;
}

function isValidDate(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const d = new Date(str);
  return !isNaN(d.getTime());
}

function isValidNumber(val: any): boolean {
  if (val === null || val === undefined || val === '') return false;
  return !isNaN(Number(val));
}

function parseSheetData(wb: XLSX.WorkBook, sheetName: string): any[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

function validateBookRow(row: any, index: number, errors: string[]): Book | null {
  const id = parseInt(row.id);
  if (isNaN(id) || id <= 0) {
    errors.push(`Books row ${index + 1}: Invalid id`);
    return null;
  }

  const name = String(row.name || '').trim();
  if (!name) {
    errors.push(`Books row ${index + 1}: Missing name`);
    return null;
  }

  const costPrice = Number(row.costPrice) || 0;
  const sellPrice = Number(row.sellPrice) || 0;
  const stock = Math.max(0, parseInt(row.stock) || 0);
  const targetStock = parseInt(row.targetStock) || 5;

  return {
    id,
    name,
    author: String(row.author || '').trim(),
    isbn: String(row.isbn || '').trim(),
    costPrice: Math.max(0, costPrice),
    sellPrice: Math.max(0, sellPrice),
    stock,
    targetStock: Math.max(1, targetStock),
  };
}

function validateSaleRow(row: any, index: number, errors: string[]): Sale | null {
  const id = parseInt(row.id);
  if (isNaN(id) || id <= 0) {
    errors.push(`Sales row ${index + 1}: Invalid id`);
    return null;
  }

  const date = String(row.date || '');
  if (!isValidDate(date)) {
    errors.push(`Sales row ${index + 1}: Invalid date "${date}"`);
    return null;
  }

  return {
    id,
    bookId: parseInt(row.bookId) || 0,
    bookName: String(row.bookName || '').trim(),
    qty: Math.max(0, parseInt(row.qty) || 0),
    totalAmount: Math.max(0, Number(row.totalAmount) || 0),
    profit: Number(row.profit) || 0,
    date,
  };
}

function validateExpenseRow(row: any, index: number, errors: string[]): Expense | null {
  const id = parseInt(row.id);
  if (isNaN(id) || id <= 0) {
    errors.push(`Expenses row ${index + 1}: Invalid id`);
    return null;
  }

  const amount = Number(row.amount);
  if (!isValidNumber(row.amount) || amount < 0) {
    errors.push(`Expenses row ${index + 1}: Invalid amount`);
    return null;
  }

  const date = String(row.date || '');
  if (!isValidDate(date)) {
    errors.push(`Expenses row ${index + 1}: Invalid date "${date}"`);
    return null;
  }

  return {
    id,
    type: String(row.type || 'Misc').trim(),
    amount,
    description: String(row.description || '').trim(),
    date,
  };
}

export async function pickExcelFile(): Promise<{ uri: string; name: string } | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name || 'unknown.xlsx' };
  } catch {
    return null;
  }
}

export async function restoreFromExcel(fileUri: string): Promise<RestoreResult> {
  const errors: string[] = [];

  try {
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    let wb: XLSX.WorkBook;
    try {
      wb = XLSX.read(fileContent, { type: 'base64' });
    } catch {
      return {
        success: false,
        errors: ['File is corrupted or not a valid Excel file'],
        message: 'Failed to parse Excel file',
      };
    }

    const sheetNames = wb.SheetNames.map(s => s.toLowerCase());
    const hasBooks = sheetNames.some(s => s === 'books');
    const hasSales = sheetNames.some(s => s === 'sales');

    if (!hasBooks && !hasSales) {
      return {
        success: false,
        errors: ['Required sheets "Books" or "Sales" not found in workbook'],
        message: 'Invalid backup file structure',
      };
    }

    const booksSheetName = wb.SheetNames.find(s => s.toLowerCase() === 'books') || '';
    const salesSheetName = wb.SheetNames.find(s => s.toLowerCase() === 'sales') || '';
    const expensesSheetName = wb.SheetNames.find(s => s.toLowerCase() === 'expenses') || '';

    const rawBooks = booksSheetName ? parseSheetData(wb, booksSheetName) : [];
    const rawSales = salesSheetName ? parseSheetData(wb, salesSheetName) : [];
    const rawExpenses = expensesSheetName ? parseSheetData(wb, expensesSheetName) : [];

    const validBooks: Book[] = [];
    const seenBookIds = new Set<number>();
    rawBooks.forEach((row, i) => {
      const book = validateBookRow(row, i, errors);
      if (book && !seenBookIds.has(book.id)) {
        seenBookIds.add(book.id);
        validBooks.push(book);
      }
    });

    const validSales: Sale[] = [];
    const seenSaleIds = new Set<number>();
    rawSales.forEach((row, i) => {
      const sale = validateSaleRow(row, i, errors);
      if (sale && !seenSaleIds.has(sale.id)) {
        seenSaleIds.add(sale.id);
        validSales.push(sale);
      }
    });

    const validExpenses: Expense[] = [];
    const seenExpenseIds = new Set<number>();
    rawExpenses.forEach((row, i) => {
      const expense = validateExpenseRow(row, i, errors);
      if (expense && !seenExpenseIds.has(expense.id)) {
        seenExpenseIds.add(expense.id);
        validExpenses.push(expense);
      }
    });

    if (validBooks.length === 0 && validSales.length === 0 && validExpenses.length === 0) {
      return {
        success: false,
        errors: [...errors, 'No valid data found to restore'],
        message: 'Restore file contains no valid data',
      };
    }

    const currentData = await db.getRawData();

    try {
      await db.clearAllData();
      await db.restoreData({
        books: validBooks,
        sales: validSales,
        expenses: validExpenses,
      });
    } catch (restoreError: any) {
      try {
        await db.restoreData(currentData);
      } catch {}
      return {
        success: false,
        errors: [...errors, `Restore failed: ${restoreError?.message || 'Unknown error'}`],
        message: 'Restore failed, previous data has been kept',
      };
    }

    return {
      success: true,
      imported: {
        books: { added: validBooks.length },
        sales: { added: validSales.length },
        expenses: { added: validExpenses.length },
      },
      errors,
      message: `Restored ${validBooks.length} books, ${validSales.length} sales, ${validExpenses.length} expenses`,
    };
  } catch (error: any) {
    return {
      success: false,
      errors: [...errors, error?.message || 'Unknown error'],
      message: 'Restore failed due to an unexpected error',
    };
  }
}
