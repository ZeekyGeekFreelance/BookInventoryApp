import AsyncStorage from '@react-native-async-storage/async-storage';

const BOOKS_KEY = '@bookshop_books';
const SALES_KEY = '@bookshop_sales';

export interface Book {
  id: number;
  name: string;
  author: string;
  stock: number;
  targetStock: number;
  costPrice: number;
  sellPrice: number;
  isbn: string;
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

export interface DashboardStats {
  totalStock: number;
  stockValue: number;
  totalSales: number;
  netProfit: number;
}

let nextBookId = 1;
let nextSaleId = 1;

async function loadIds() {
  const books = await getBooks();
  const sales = await getSales();
  if (books.length > 0) {
    nextBookId = Math.max(...books.map(b => b.id)) + 1;
  }
  if (sales.length > 0) {
    nextSaleId = Math.max(...sales.map(s => s.id)) + 1;
  }
}

loadIds();

async function getBooks(): Promise<Book[]> {
  const data = await AsyncStorage.getItem(BOOKS_KEY);
  return data ? JSON.parse(data) : [];
}

async function saveBooks(books: Book[]): Promise<void> {
  await AsyncStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

async function getSales(): Promise<Sale[]> {
  const data = await AsyncStorage.getItem(SALES_KEY);
  return data ? JSON.parse(data) : [];
}

async function saveSales(sales: Sale[]): Promise<void> {
  await AsyncStorage.setItem(SALES_KEY, JSON.stringify(sales));
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

  async addBook(book: Omit<Book, 'id'>): Promise<Book> {
    const books = await getBooks();
    const newBook: Book = { ...book, id: nextBookId++ };
    books.push(newBook);
    await saveBooks(books);
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
    if (idx !== -1) {
      books[idx].stock = Math.max(0, books[idx].stock + delta);
      await saveBooks(books);
    }
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

  async getDashboardStats(): Promise<DashboardStats> {
    const books = await getBooks();
    const sales = await getSales();

    const totalStock = books.reduce((acc, b) => acc + b.stock, 0);
    const stockValue = books.reduce((acc, b) => acc + (b.stock * b.costPrice), 0);
    const totalSales = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const netProfit = sales.reduce((acc, s) => acc + s.profit, 0);

    return { totalStock, stockValue, totalSales, netProfit };
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
    const from = new Date(fromDate).getTime();
    return sales
      .filter(s => new Date(s.date).getTime() >= from)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getLowStockBooks(): Promise<Book[]> {
    const books = await getBooks();
    return books.filter(b => b.stock <= (b.targetStock || 3) || b.stock === 0);
  },

  async exportData(): Promise<string> {
    const books = await getBooks();
    const sales = await getSales();
    return JSON.stringify({ books, sales, timestamp: new Date().toISOString() }, null, 2);
  },

  async importData(jsonStr: string): Promise<void> {
    const data = JSON.parse(jsonStr);
    if (!data.books || !data.sales) {
      throw new Error('Invalid backup file format');
    }
    await saveBooks(data.books);
    await saveSales(data.sales);
    await loadIds();
  },
};
