const fs = require('node:fs');
const path = require('node:path');

function setupEnvironments(root = process.cwd(), env = process.env) {
  const directory = path.join(root, 'src/environments');
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_PUBLISHABLE_KEY?.trim();
  const cloudBuild = env.VERCEL === '1';

  if (cloudBuild || url !== undefined || key !== undefined) {
    if (!url || !key) {
      throw new Error('Configura SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY antes del build.');
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      throw new Error('SUPABASE_URL debe ser una URL HTTPS valida.');
    }
    if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password) {
      throw new Error('SUPABASE_URL debe ser una URL HTTPS sin credenciales.');
    }

    let publicKey = key.startsWith('sb_publishable_') && key.length > 15;
    if (!publicKey) {
      try {
        const parts = key.split('.');
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
        publicKey = parts.length === 3 && payload.role === 'anon';
      } catch {
        publicKey = false;
      }
    }
    if (!publicKey) {
      throw new Error(
        'SUPABASE_PUBLISHABLE_KEY debe ser publishable o anon; no se permiten claves privadas.',
      );
    }

    fs.mkdirSync(directory, { recursive: true });
    const configuration = { supabaseUrl: url, supabasePublishableKey: key };
    fs.writeFileSync(
      path.join(directory, 'environment.ts'),
      `// Generado desde variables de compilacion. No versionar.\nexport const environment = ${JSON.stringify(configuration, null, 2)} as const;\n`,
    );
    console.log('Environment de produccion generado sin mostrar valores.');
  }

  if (cloudBuild) return;

  for (const name of ['environment.ts', 'environment.development.ts']) {
    const target = path.join(directory, name);
    if (!fs.existsSync(target)) {
      fs.copyFileSync(path.join(directory, 'environment.example.ts'), target);
      console.log(`Creado ${name}. Configura tu URL y clave publica de Supabase.`);
    }
  }
}

module.exports = { setupEnvironments };

if (require.main === module) {
  try {
    setupEnvironments();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
