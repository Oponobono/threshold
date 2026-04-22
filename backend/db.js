const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Conexión a la base de datos
const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error al conectar con SQLite:', err.message);
  } else {
    console.log('Conectado a la base de datos SQLite.');
  }
});

// Inicializar tablas
const initializeDb = () => {
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

    // 4. Tabla de Calificaciones (Assessments)
    db.run(`
      CREATE TABLE IF NOT EXISTS assessments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT, -- Quiz, Assignment, Lab, Exam
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

    // 5. Tabla de Galería (Scanned Items)
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

    // Usuario semilla de desarrollo para no repetir registros en cada cambio de esquema.
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

module.exports = {
  db,
  initializeDb,
};
