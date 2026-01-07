import { open } from 'sqlite'
import sqlite3 from 'sqlite3'; 

export async function openDb () {
  const db = await open({
    filename: './database.db', 
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      descricao TEXT,
      categoria TEXT,
      subcategoria TEXT,
      marca TEXT,
      modelo TEXT,
      material TEXT,
      cor TEXT,
      tamanho TEXT,
      quantidade_em_estoque INTEGER NOT NULL,
      estoque_minimo INTEGER NOT NULL DEFAULT 0,
      preco REAL NOT NULL,
      preco_promocional REAL,
      peso REAL,
      imagens TEXT,
      data_de_cadastro TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );
  `);

  await db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        cliente TEXT,
        itens TEXT NOT NULL,
        valor_total REAL NOT NULL,
        forma_pagamento TEXT NOT NULL,
        status_venda TEXT NOT NULL
    );
  `);
  
  return db;
}