
const path = require('path');
const bcrypt = require('bcrypt');

const isProduction = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL;

let db;
let pool;

if (isProduction) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  const convertQuery = (sql) => {
    let index = 1;
    let pgSql = sql.replace(/\?/g, () => `$${index++}`);
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql += ' RETURNING id';
    }
    // ON CONFLICT(device_id) DO UPDATE SET -> in Postgres requires same syntax if device_id is unique
    return pgSql;
  };

  db = {
    run: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(convertQuery(sql), params, (err, res) => {
        if (err && err.code === '23505') {
          // Map Postgres unique constraint error to SQLite style for consistency
          err.message = 'UNIQUE constraint failed: ' + err.message;
        }
        if (callback) {
          const context = {
            lastID: res && res.rows && res.rows[0] ? res.rows[0].id : null,
            changes: res ? res.rowCount : 0
          };
          callback.call(context, err);
        }
      });
    },
    get: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(convertQuery(sql), params, (err, res) => {
        if (callback) callback(err, res && res.rows ? res.rows[0] : null);
      });
    },
    all: (sql, params, callback) => {
      if (typeof params === 'function') {
        callback = params;
        params = [];
      }
      pool.query(convertQuery(sql), params, (err, res) => {
        if (callback) callback(err, res ? res.rows : []);
      });
    },
    serialize: (callback) => {
      // Postgres pool handles concurrency, we just execute the callback
      callback();
    }
  };

  console.log('Conectado a la base de datos PostgreSQL.');

} else {
  const sqlite3 = require('sqlite3').verbose();
  // Conexión a la base de datos local SQLite
  const dbPath = path.resolve(__dirname, 'database.sqlite');
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al conectar con SQLite:', err.message);
    } else {
      console.log('Conectado a la base de datos SQLite.');
    }
  });
}

const initializePostgresDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        lastname TEXT,
        username TEXT UNIQUE,
        grading_scale TEXT,
        approval_threshold REAL,
        major TEXT,
        university TEXT,
        biometric_token TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const usersCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'users'`);
    const existingColumns = new Set(usersCols.rows.map(r => r.column_name));
    const missingColumns = [
      { name: 'name', type: 'TEXT' },
      { name: 'lastname', type: 'TEXT' },
      { name: 'username', type: 'TEXT' },
      { name: 'grading_scale', type: 'TEXT' },
      { name: 'approval_threshold', type: 'REAL' },
      { name: 'major', type: 'TEXT' },
      { name: 'university', type: 'TEXT' },
    ].filter(column => !existingColumns.has(column.name));

    for (let column of missingColumns) {
      await pool.query(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`);
      console.log(`Columna agregada en users: ${column.name}`);
    }

    await pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username) WHERE username IS NOT NULL`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS app_visitors (
        device_id TEXT PRIMARY KEY,
        first_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_visit_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        visit_count INTEGER DEFAULT 1
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        credits INTEGER,
        professor TEXT,
        color TEXT DEFAULT '#CCCCCC',
        icon TEXT DEFAULT 'book-outline',
        target_grade REAL,
        folder_path TEXT
      )
    `);

    const subjectsCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'subjects'`);
    const existingSubjCols = new Set(subjectsCols.rows.map(r => r.column_name));
    const missingSubjCols = [
      { name: 'color', type: "TEXT DEFAULT '#CCCCCC'" },
      { name: 'icon', type: "TEXT DEFAULT 'book-outline'" },
      { name: 'target_grade', type: 'REAL' },
      { name: 'folder_path', type: 'TEXT' },
    ].filter(column => !existingSubjCols.has(column.name));

    for (let column of missingSubjCols) {
      await pool.query(`ALTER TABLE subjects ADD COLUMN ${column.name} ${column.type}`);
      console.log(`Columna agregada en subjects: ${column.name}`);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects (id) ON DELETE CASCADE,
        local_uri TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        es_favorita INTEGER DEFAULT 0
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS assessments (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        name TEXT NOT NULL,
        type TEXT,
        date TEXT,
        weight TEXT,
        out_of INTEGER,
        score INTEGER,
        percentage REAL,
        grade_value REAL,
        is_completed INTEGER DEFAULT 0
      )
    `);

    const assessCols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'assessments'`);
    const existingAssessCols = new Set(assessCols.rows.map(r => r.column_name));
    const missingAssessCols = [
      { name: 'percentage', type: 'REAL' },
      { name: 'grade_value', type: 'REAL' },
      { name: 'is_completed', type: 'INTEGER DEFAULT 0' },
    ].filter(column => !existingAssessCols.has(column.name));

    for (let column of missingAssessCols) {
      await pool.query(`ALTER TABLE assessments ADD COLUMN ${column.name} ${column.type}`);
      console.log(`Columna agregada en assessments: ${column.name}`);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS gallery_items (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        uri TEXT NOT NULL,
        subject TEXT,
        date TEXT,
        time TEXT,
        ocr_text TEXT,
        is_starred BOOLEAN DEFAULT false
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id),
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL
      )
    `);

    const { rows: existingUser } = await pool.query(`SELECT id FROM users WHERE email = $1`, ['user']);
    if (existingUser.length === 0) {
      const defaultPasswordHash = bcrypt.hashSync('1234', 10);
      await pool.query(`
        INSERT INTO users (email, password_hash, name, lastname, username, grading_scale, approval_threshold)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, ['user', defaultPasswordHash, 'Default', 'User', 'user', '0-5.0', 3.0]);
      console.log('Usuario por defecto creado: user / 1234');
    }

    console.log('Tablas inicializadas correctamente en Postgres.');
  } catch (err) {
    console.error('Error inicializando tablas en Postgres:', err.message);
  }
};

const initializeSqliteDb = () => {
  db.serialize(() => {
    // 1. Tabla de Usuarios Registrados
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT,
        lastname TEXT,
        username TEXT UNIQUE,
        grading_scale TEXT,
        approval_threshold REAL,
        major TEXT,
        university TEXT,
        biometric_token TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.all(`PRAGMA table_info(users)`, (err, rows) => {
      if (err) {
        console.error('Error verificando columnas de users:', err.message);
        return;
      }

      const existingColumns = new Set(rows.map((row) => row.name));
      const missingColumns = [
        { name: 'name', type: 'TEXT' },
        { name: 'lastname', type: 'TEXT' },
        { name: 'username', type: 'TEXT' },
        { name: 'grading_scale', type: 'TEXT' },
        { name: 'approval_threshold', type: 'REAL' },
        { name: 'major', type: 'TEXT' },
        { name: 'university', type: 'TEXT' },
      ].filter((column) => !existingColumns.has(column.name));

      missingColumns.forEach((column) => {
        db.run(`ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
          if (alterErr) {
            console.error(`Error agregando columna ${column.name}:`, alterErr.message);
            return;
          }
          console.log(`Columna agregada en users: ${column.name}`);
        });
      });

      db.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username) WHERE username IS NOT NULL`,
        (indexErr) => {
          if (indexErr) {
            console.error('Error creando indice unico para username:', indexErr.message);
          }
        }
      );
    });

    // 2. Tabla de Visitantes / Análisis de Invitados
    db.run(`
      CREATE TABLE IF NOT EXISTS app_visitors (
        device_id TEXT PRIMARY KEY,
        first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_visit_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        visit_count INTEGER DEFAULT 1
      )
    `);

    // 3. Tabla de Materias (Subjects)
    db.run(`
      CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        code TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        credits INTEGER,
        professor TEXT,
        color TEXT DEFAULT '#CCCCCC',
        icon TEXT DEFAULT 'book-outline',
        target_grade REAL,
        folder_path TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    db.all(`PRAGMA table_info(subjects)`, (err, rows) => {
      if (err) {
        console.error('Error verificando columnas de subjects:', err.message);
        return;
      }

      const existingColumns = new Set(rows.map((row) => row.name));
      const missingColumns = [
        { name: 'color', type: "TEXT DEFAULT '#CCCCCC'" },
        { name: 'icon', type: "TEXT DEFAULT 'book-outline'" },
        { name: 'target_grade', type: 'REAL' },
        { name: 'folder_path', type: 'TEXT' },
      ].filter((column) => !existingColumns.has(column.name));

      missingColumns.forEach((column) => {
        db.run(`ALTER TABLE subjects ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
          if (alterErr) {
            console.error(`Error agregando columna ${column.name} en subjects:`, alterErr.message);
            return;
          }
          console.log(`Columna agregada en subjects: ${column.name}`);
        });
      });
    });

    // 4. Tabla de Fotos (La "Galería")
    db.run(`
      CREATE TABLE IF NOT EXISTS photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        local_uri TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        es_favorita INTEGER DEFAULT 0,
        FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
      )
    `);

    // 5. Tabla de Evaluaciones (Assessments)
    db.run(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT,
        date TEXT,
        weight TEXT,
        out_of INTEGER,
        score INTEGER,
        percentage REAL,
        grade_value REAL,
        is_completed INTEGER DEFAULT 0,
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      )
    `);

    db.all(`PRAGMA table_info(assessments)`, (err, rows) => {
      if (err) {
        console.error('Error verificando columnas de assessments:', err.message);
        return;
      }

      const existingColumns = new Set(rows.map((row) => row.name));
      const missingColumns = [
        { name: 'percentage', type: 'REAL' },
        { name: 'grade_value', type: 'REAL' },
        { name: 'is_completed', type: 'INTEGER DEFAULT 0' },
      ].filter((column) => !existingColumns.has(column.name));

      missingColumns.forEach((column) => {
        db.run(`ALTER TABLE assessments ADD COLUMN ${column.name} ${column.type}`, (alterErr) => {
          if (alterErr) {
            console.error(`Error agregando columna ${column.name} en assessments:`, alterErr.message);
            return;
          }
          console.log(`Columna agregada en assessments: ${column.name}`);
        });
      });
    });

    // 6. Tabla de Galería Antigua (Legacy - Gallery Items)
    db.run(`
      CREATE TABLE IF NOT EXISTS gallery_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        uri TEXT NOT NULL,
        subject TEXT,
        date TEXT,
        time TEXT,
        ocr_text TEXT,
        is_starred BOOLEAN DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // 7. Tabla de Horarios (Schedules)
    db.run(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        day_of_week INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        FOREIGN KEY (subject_id) REFERENCES subjects(id)
      )
    `);

    db.get(`SELECT id FROM users WHERE email = ?`, ['user'], (err, existingUser) => {
      if (err) {
        console.error('Error verificando usuario por defecto:', err.message);
        return;
      }

      if (existingUser) return;

      const defaultPasswordHash = bcrypt.hashSync('1234', 10);
      const seedQuery = `
        INSERT INTO users (email, password_hash, name, lastname, username, grading_scale, approval_threshold)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        seedQuery,
        ['user', defaultPasswordHash, 'Default', 'User', 'user', '0-5.0', 3.0],
        (seedErr) => {
          if (seedErr) {
            console.error('Error creando usuario por defecto:', seedErr.message);
            return;
          }
          console.log('Usuario por defecto creado: user / 1234');
        }
      );
    });

    console.log('Tablas inicializadas correctamente.');
  });
};

const initializeDb = () => {
  if (isProduction) {
    initializePostgresDb();
  } else {
    initializeSqliteDb();
  }
};

module.exports = {
  db,
  initializeDb,
};

