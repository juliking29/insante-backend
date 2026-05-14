const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: '20.169.91.203',
    user: 'backenduser',
    password: 'AESPA17king',
    database: 'insante_db',
    port: 3306
  });

  // Buscar usuarios con password plano
  const [usuarios] = await connection.execute(
    "SELECT id_usuario, password_hash FROM usuarios WHERE password_hash = '123456'"
  );

  for (const usuario of usuarios) {
    const nuevoHash = await bcrypt.hash('123456', 10);

    await connection.execute(
      'UPDATE usuarios SET password_hash = ? WHERE id_usuario = ?',
      [nuevoHash, usuario.id_usuario]
    );

    console.log(`Usuario ${usuario.id_usuario} actualizado`);
  }

  console.log('Todos los usuarios fueron encriptados');

  await connection.end();
}

run().catch(console.error);