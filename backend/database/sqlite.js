const bcrypt = require('bcrypt');
const tableSchema = require('./schema');
const { migrateColumnsSqlite } = require('./migrations');

const initializeSqliteDb = (db) => {
  return new Promise((resolve) => {
    db.serialize(async () => {
      // Crear todas las tablas
      for (const [tableName, schema] of Object.entries(tableSchema)) {
        db.run(schema.sqlite, (err) => {
          if (err) {
            console.error(`Error creando tabla ${tableName}:`, err.message);
          } else {
            console.log(`✓ Tabla creada/verificada: ${tableName}`);
          }
        });
      }

      // Crear índices únicos
      db.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username) WHERE username IS NOT NULL`,
        (err) => {
          if (err) {
            console.error('Error creando índice único:', err.message);
          }
        }
      );

      // Migrar columnas faltantes con promesas
      const migrateAll = async () => {
        for (const [tableName, schema] of Object.entries(tableSchema)) {
          if (schema.columns) {
            await migrateColumnsSqlite(db, tableName, schema.columns);
          }
        }

        // Crear usuario por defecto
        db.get(`SELECT id FROM users WHERE email = ?`, ['user'], (err, existingUser) => {
          if (err) {
            console.error('Error verificando usuario por defecto:', err.message);
            resolve();
            return;
          }

          if (existingUser) {
            resolve();
            return;
          }

          const defaultPasswordHash = bcrypt.hashSync('1234', 10);
          db.run(
            `INSERT INTO users (email, password_hash, name, lastname, username, grading_scale, approval_threshold)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ['user', defaultPasswordHash, 'Default', 'User', 'user', '0-5.0', 3.0],
            (seedErr) => {
              if (seedErr) {
                console.error('Error creando usuario por defecto:', seedErr.message);
              } else {
                console.log('✓ Usuario por defecto creado: user / 1234');
              }
              console.log('✅ Base de datos SQLite inicializada correctamente.');
              resolve();
            }
          );
        });
      };

      migrateAll();
    });
  });
};

module.exports = initializeSqliteDb;
