import pg from 'pg';
const { Pool } = pg;

export async function openDb() {
  const rawUrl = process.env.POSTGRES_URL;
  if (!rawUrl) {
    console.error("DEBUG: POSTGRES_URL is undefined or empty");
  } else {
    const masked = rawUrl.replace(/:([^:@]+)@/, ':***@');
    console.log("DEBUG: POSTGRES_URL value is:", masked);
  }

  const pool = new Pool({
    connectionString: rawUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
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

    await client.query(`
      ALTER TABLE products ADD COLUMN IF NOT EXISTS descricao TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS categoria TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS subcategoria TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS marca TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS modelo TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS material TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS cor TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS tamanho TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS estoque_minimo INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS preco_promocional REAL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS peso REAL;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS imagens TEXT;
      ALTER TABLE products ADD COLUMN IF NOT EXISTS ativo INTEGER NOT NULL DEFAULT 1;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id SERIAL PRIMARY KEY,
        data TEXT NOT NULL,
        cliente TEXT,
        itens TEXT NOT NULL,
        valor_total REAL NOT NULL,
        forma_pagamento TEXT NOT NULL,
        status_venda TEXT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        nome TEXT,
        foto TEXT,
        google_id TEXT UNIQUE,
        status TEXT DEFAULT 'pendente'
      );
    `);

    return pool;
  } finally {
    client.release();
  }
}