import { open } from 'sqlite'
import sqlite3 from 'sqlite3'; 

export async function openDb () {
  const db = await open({
    filename: './database.db', 
    driver: sqlite3.Database
  });


  //Tabela de produtos
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
      preco REAL NOT NULL,
      preco_promocional REAL,
      peso REAL,
      imagens TEXT,
      data_de_cadastro TEXT NOT NULL,
      ativo INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Tabela de Vendas 
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT NOT NULL,
        cliente TEXT,
        itens TEXT NOT NULL, -- JSON string for SaleItem[]
        valor_total REAL NOT NULL,
        forma_pagamento TEXT NOT NULL,
        status_venda TEXT NOT NULL
    );
  `);
  
  return db;
}