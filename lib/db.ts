import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKS_KEY = '@bookshop_books';
const SALES_KEY = '@bookshop_sales';
const EXPENSES_KEY = '@bookshop_expenses';
const RESTOCKS_KEY = '@bookshop_restocks';

export interface Book {
  id: number;
  name: string;
  author: string;
  stock: number;
  targetStock: number;
  costPrice: number;
  sellPrice: number;
  isbn: string;
  lastStockedAt?: string;
}

export interface Restock {
  id: number;
  bookId: number;
  bookName: string;
  qtyAdded: number;
  date: string;
}

export interface Sale {
  id: number;
  bookId: number;
  bookName: string;
  qty: number;
  totalAmount: number;
  profit: number;
  date: string;
}

export interface Expense {
  id: number;
  type: string;
  amount: number;
  description: string;
  date: string;
}

export const EXPENSE_CATEGORIES = [
  'Food',
  'Rent',
  'Fuel',
  'Utilities',
  'Stationery',
  'Transport',
  'Misc',
] as const;

export interface DashboardStats {
  totalStock: number;
  stockValue: number;
  totalSales: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalBooks: number;
  lowStockCount: number;
  profitMargin: number;
  totalTransactions: number;
}

let nextBookId = 1;
let nextSaleId = 1;
let nextExpenseId = 1;
let nextRestockId = 1;

async function loadIds() {
  try {
    const books = await getBooks();
    const sales = await getSales();
    const expenses = await getExpenses();
    const restocks = await getRestocks();
    if (books.length > 0) {
      nextBookId = Math.max(...books.map(b => b.id)) + 1;
    }
    if (sales.length > 0) {
      nextSaleId = Math.max(...sales.map(s => s.id)) + 1;
    }
    if (expenses.length > 0) {
      nextExpenseId = Math.max(...expenses.map(e => e.id)) + 1;
    }
    if (restocks.length > 0) {
      nextRestockId = Math.max(...restocks.map(r => r.id)) + 1;
    }
  } catch {
    nextBookId = 1;
    nextSaleId = 1;
    nextExpenseId = 1;
    nextRestockId = 1;
  }
}

loadIds();

async function getBooks(): Promise<Book[]> {
  try {
    const data = await AsyncStorage.getItem(BOOKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveBooks(books: Book[]): Promise<void> {
  await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

async function getSales(): Promise<Sale[]> {
  try {
    const data = await AsyncStorage.getItem(SALES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveSales(sales: Sale[]): Promise<void> {
  await AsyncStorage.setItem(SALES_KEY, JSON.stringify(sales));
}

async function getExpenses(): Promise<Expense[]> {
  try {
    const data = await AsyncStorage.getItem(EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveExpenses(expenses: Expense[]): Promise<void> {
  await AsyncStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

async function getRestocks(): Promise<Restock[]> {
  try {
    const data = await AsyncStorage.getItem(RESTOCKS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveRestocks(restocks: Restock[]): Promise<void> {
  await AsyncStorage.setItem(RESTOCKS_KEY, JSON.stringify(restocks));
}

export const db = {
  async getAllBooks(): Promise<Book[]> {
    const books = await getBooks();
    return books.sort((a, b) => {
      const aLow = a.stock <= (a.targetStock || 3) ? 0 : 1;
      const bLow = b.stock <= (b.targetStock || 3) ? 0 : 1;
      if (aLow !== bLow) return aLow - bLow;
      return a.name.localeCompare(b.name);
    });
  },

  async searchBooks(query: string): Promise<Book[]> {
    const books = await getBooks();
    const q = query.toLowerCase();
    return books
      .filter(b => b.name.toLowerCase().includes(q) || b.author.toLowerCase().includes(q))
      .sort((a, b) => {
        const aLow = a.stock <= 3 ? 0 : 1;
        const bLow = b.stock <= 3 ? 0 : 1;
        if (aLow !== bLow) return aLow - bLow;
        return a.name.localeCompare(b.name);
      });
  },

  async addBook(book: Omit<Book, 'id' | 'lastStockedAt'>): Promise<Book> {
    const books = await getBooks();
    const now = new Date().toISOString();
    const newBook: Book = { ...book, id: nextBookId++, lastStockedAt: now };
    books.push(newBook);
    await saveBooks(books);

    // Also record as a restock
    await this.recordRestock(newBook.id, newBook.name, newBook.stock, now);

    return newBook;
  },

  async updateBook(book: Book): Promise<void> {
    const books = await getBooks();
    const idx = books.findIndex(b => b.id === book.id);
    if (idx !== -1) {
      books[idx] = book;
      await saveBooks(books);
    }
  },

  async deleteBook(id: number): Promise<void> {
    const books = await getBooks();
    await saveBooks(books.filter(b => b.id !== id));
  },

  async updateStock(id: number, delta: number): Promise<void> {
    const books = await getBooks();
    const idx = books.findIndex(b => b.id === id);
    const now = new Date().toISOString();
    if (idx !== -1) {
      books[idx].stock = Math.max(0, books[idx].stock + delta);
      if (delta > 0) {
        books[idx].lastStockedAt = now;
        await this.recordRestock(id, books[idx].name, delta, now);
      }
      await saveBooks(books);
    }
  },

  async recordRestock(bookId: number, bookName: string, qtyAdded: number, date: string): Promise<void> {
    const restocks = await getRestocks();
    const restock: Restock = {
      id: nextRestockId++,
      bookId,
      bookName,
      qtyAdded,
      date,
    };
    restocks.push(restock);
    await saveRestocks(restocks);
  },

  async getAllRestocks(): Promise<Restock[]> {
    const restocks = await getRestocks();
    return restocks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async recordSale(bookId: number, qty: number, totalAmount: number, costPrice: number, bookName: string): Promise<void> {
    const profit = totalAmount - (qty * costPrice);
    const date = new Date().toISOString();
    const sale: Sale = {
      id: nextSaleId++,
      bookId,
      bookName,
      qty,
      totalAmount,
      profit,
      date,
    };
    const sales = await getSales();
    sales.push(sale);
    await saveSales(sales);
    await this.updateStock(bookId, -qty);
  },

  async getAllExpenses(): Promise<Expense[]> {
    const expenses = await getExpenses();
    return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
    const expenses = await getExpenses();
    const newExpense: Expense = { ...expense, id: nextExpenseId++ };
    expenses.push(newExpense);
    await saveExpenses(expenses);
    return newExpense;
  },

  async updateExpense(expense: Expense): Promise<void> {
    const expenses = await getExpenses();
    const idx = expenses.findIndex(e => e.id === expense.id);
    if (idx !== -1) {
      expenses[idx] = expense;
      await saveExpenses(expenses);
    }
  },

  async deleteExpense(id: number): Promise<void> {
    const expenses = await getExpenses();
    await saveExpenses(expenses.filter(e => e.id !== id));
  },

  async getExpensesFromDate(fromDate: string): Promise<Expense[]> {
    const expenses = await getExpenses();
    const from = new Date(fromDate).getTime();
    return expenses
      .filter(e => new Date(e.date).getTime() >= from)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getDashboardStats(): Promise<DashboardStats> {
    const books = await getBooks();
    const sales = await getSales();
    const expenses = await getExpenses();

    const totalStock = books.reduce((acc, b) => acc + b.stock, 0);
    const stockValue = books.reduce((acc, b) => acc + (b.stock * b.costPrice), 0);
    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const grossProfit = sales.reduce((acc, s) => acc + s.profit, 0);
    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const lowStockCount = books.filter(b => b.stock <= (b.targetStock || 3) || b.stock === 0).length;
    const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : 0;

    return {
      totalStock,
      stockValue,
      totalSales,
      grossProfit,
      totalExpenses,
      netProfit,
      totalBooks: books.length,
      lowStockCount,
      profitMargin,
      totalTransactions: sales.length,
    };
  },

  async getStockValueBreakdown(): Promise<(Book & { totalValue: number })[]> {
    const books = await getBooks();
    return books
      .filter(b => b.stock > 0)
      .map(b => ({ ...b, totalValue: b.stock * b.costPrice }))
      .sort((a, b) => b.totalValue - a.totalValue);
  },

  async getSalesHistory(): Promise<Sale[]> {
    const sales = await getSales();
    return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 50);
  },

  async getSalesFromDate(fromDate: string): Promise<Sale[]> {
    const sales = await getSales();
    const from = new Date(fromDate);
    // Set to start of the day for filtering
    const fromTime = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
    const endTime = fromTime + 86400000; // +1 day

    return sales
      .filter(s => {
        const saleTime = new Date(s.date).getTime();
        return saleTime >= fromTime && saleTime < endTime;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getLowStockBooks(): Promise<Book[]> {
    const books = await getBooks();
    return books.filter(b => b.stock <= (b.targetStock || 3) || b.stock === 0);
  },

  async getRawData(): Promise<{ books: Book[]; sales: Sale[]; expenses: Expense[]; restocks: Restock[] }> {
    const books = await getBooks();
    const sales = await getSales();
    const expenses = await getExpenses();
    const restocks = await getRestocks();
    return { books, sales, expenses, restocks };
  },

  async hasExistingData(): Promise<boolean> {
    const books = await getBooks();
    const sales = await getSales();
    const expenses = await getExpenses();
    const restocks = await getRestocks();
    return books.length > 0 || sales.length > 0 || expenses.length > 0 || restocks.length > 0;
  },

  async clearAllData(): Promise<void> {
    await AsyncStorage.multiSet([
      [BOOKS_KEY, '[]'],
      [SALES_KEY, '[]'],
      [EXPENSES_KEY, '[]'],
      [RESTOCKS_KEY, '[]'],
    ]);
    nextBookId = 1;
    nextSaleId = 1;
    nextExpenseId = 1;
    nextRestockId = 1;
  },

  async restoreData(data: { books: Book[]; sales: Sale[]; expenses: Expense[]; restocks: Restock[] }): Promise<void> {
    await AsyncStorage.multiSet([
      [BOOKS_KEY, JSON.stringify(data.books || [])],
      [SALES_KEY, JSON.stringify(data.sales || [])],
      [EXPENSES_KEY, JSON.stringify(data.expenses || [])],
      [RESTOCKS_KEY, JSON.stringify(data.restocks || [])],
    ]);
    await loadIds();
  },

  async exportData(): Promise<string> {
    const books = await getBooks();
    const sales = await getSales();
    const expenses = await getExpenses();
    const restocks = await getRestocks();
    return JSON.stringify({ books, sales, expenses, restocks, timestamp: new Date().toISOString() }, null, 2);
  },

  async importData(jsonStr: string): Promise<void> {
    const data = JSON.parse(jsonStr);
    if (!data.books || !data.sales) {
      throw new Error('Invalid backup file format');
    }
    await saveBooks(data.books);
    await saveSales(data.sales);
    if (data.expenses) {
      await saveExpenses(data.expenses);
    }
    await loadIds();
  },
};
