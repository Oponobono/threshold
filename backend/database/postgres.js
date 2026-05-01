const bcrypt = require('bcrypt');
const tableSchema = require('./schema');
const { migrateColumnsPostgres } = require('./migrations');

const initializePostgresDb = async (pool) => {
  try {
    // Crear todas las tablas
    for (const [tableName, schema] of Object.entries(tableSchema)) {
      await pool.query(schema.postgres);
      console.log(`✓ Tabla creada/verificada: ${tableName}`);
    }

    // Migrar columnas faltantes (ANTES de crear índices que dependen de ellas)
    for (const [tableName, schema] of Object.entries(tableSchema)) {
      if (schema.columns) {
        await migrateColumnsPostgres(pool, tableName, schema.columns);
      }
    }

    // Crear índices únicos (DESPUÉS de asegurarse que las columnas existen)
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique 
      ON users(username) WHERE username IS NOT NULL
    `);

    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_share_pin_unique 
      ON users(share_pin) WHERE share_pin IS NOT NULL
    `);

    // Crear usuario por defecto
    const { rows: existingUser } = await pool.query(
      `SELECT id FROM users WHERE email = $1`,
      ['user']
    );

    if (existingUser.length === 0) {
      const defaultPasswordHash = bcrypt.hashSync('1234', 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, name, lastname, username, grading_scale, approval_threshold)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        ['user', defaultPasswordHash, 'Default', 'User', 'user', '0-5.0', 3.0]
      );
      console.log('✓ Usuario por defecto creado: user / 1234');
    }

    console.log('✅ Base de datos PostgreSQL inicializada correctamente.');
  } catch (err) {
    console.error('❌ Error inicializando PostgreSQL:', err.message);
  }
};

module.exports = initializePostgresDb;
