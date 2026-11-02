const fs = require('node:fs');
const path = 'src/environments';
for (const name of ['environment.ts', 'environment.development.ts']) {
  const target = `${path}/${name}`;
  if (!fs.existsSync(target)) {
    fs.copyFileSync(`${path}/environment.example.ts`, target);
    console.log(`Creado ${target}. Configura tu URL y clave publica de Supabase.`);
  }
}
