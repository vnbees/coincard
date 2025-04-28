import * as SQLite from 'expo-sqlite';

export interface MoneyRecord {
  id?: number;
  recipient: string;
  amount: number;
  imageUri: string;
  createdAt: string;
}

let db: any = null;

const getDB = (): any => {
  if (!db) {
    db = SQLite.openDatabaseSync('coincard.db');
  }
  return db;
};

export const runQuery = async (query: string, params: any[] = []): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.transaction((tx: any) => {
      tx.executeSql(
        query,
        params,
        (_: any, result: any) => {
          const rows = result.rows;
          const arr = [];
          for (let i = 0; i < rows.length; i++) {
            arr.push(rows.item(i));
          }
          resolve(arr);
        },
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const runWriteQuery = async (query: string, params: any[] = []): Promise<void> => {
  return new Promise((resolve, reject) => {
    const database = getDB();
    database.transaction((tx: any) => {
      tx.executeSql(
        query,
        params,
        () => resolve(),
        (_: any, error: any) => {
          reject(error);
          return false;
        }
      );
    });
  });
};

export const initDatabase = async (): Promise<void> => {
  try {
    const query = `CREATE TABLE IF NOT EXISTS money_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient TEXT NOT NULL,
      amount REAL NOT NULL,
      imageUri TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )`;
    await runWriteQuery(query);
  } catch (error) {
    console.error('Error creating database:', error);
    throw error;
  }
};

export const saveRecord = async (record: Omit<MoneyRecord, 'id'>): Promise<void> => {
  const query = 'INSERT INTO money_records (recipient, amount, imageUri, createdAt) VALUES (?, ?, ?, ?)';
  const params = [record.recipient, record.amount, record.imageUri, record.createdAt];
  try {
    await runWriteQuery(query, params);
  } catch (error) {
    console.error('Error saving record:', error);
    throw error;
  }
};

export const getAllRecords = async (): Promise<MoneyRecord[]> => {
  try {
    return await runQuery('SELECT * FROM money_records ORDER BY createdAt DESC');
  } catch (error) {
    console.error('Error getting records:', error);
    throw error;
  }
};

export const searchRecords = async (query: string): Promise<MoneyRecord[]> => {
  try {
    return await runQuery(
      'SELECT * FROM money_records WHERE recipient LIKE ?',
      [`%${query}%`]
    );
  } catch (error) {
    console.error('Error searching records:', error);
    throw error;
  }
};

const DatabaseService = {
  initDatabase,
  saveRecord,
  getAllRecords,
  searchRecords,
};

export default DatabaseService;