const sharp = require('sharp');
const fs = require('fs');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// SVG du Cauris (ton logo)
const CAURIS_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#D4AF37;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#10B981;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fond -->
  <rect width="100" height="100" fill="#020111" rx="20"/>
  
  <!-- Coquille Cauris -->
  <ellipse cx="50" cy="45" rx="28" ry="32" fill="url(#grad1)" />
  
  <!-- Ouverture du cauris -->
  <ellipse cx="50" cy="55" rx="18" ry="14" fill="#020111" />
  
  <!-- Texture/rainures -->
  <path d="M 35 30 Q 50 20 65 30" stroke="#D4AF37" stroke-width="1.5" fill="none" opacity="0.6"/>
  <path d="M 32 40 Q 50 28 68 40" stroke="#D4AF37" stroke-width="1.5" fill="none" opacity="0.5"/>
  <path d="M 30 50 Q 50 35 70 50" stroke="#10B981" stroke-width="1.5" fill="none" opacity="0.4"/>
  
  <!-- Perlage/détail -->
  <circle cx="50" cy="25" r="2" fill="#D4AF37" opacity="0.8"/>
  <circle cx="40" cy="32" r="1.5" fill="#10B981" opacity="0.7"/>
  <circle cx="60" cy="32" r="1.5" fill="#10B981" opacity="0.7"/>
  
  <!-- Lueur -->
  <ellipse cx="45" cy="35" rx="8" ry="10" fill="white" opacity="0.15" />
</svg>
`;

async function generateIcons() {
  try {
    // Créer le SVG temporaire
    fs.writeFileSync('/tmp/cauris.svg', CAURIS_SVG);
    
    console.log('🎨 Generating Cauris icons...\n');
    
    for (const size of sizes) {
      await sharp('/tmp/cauris.svg')
        .resize(size, size, {
          fit: 'contain',
          background: { r: 2, g: 1, b: 17 } // #020111
        })
        .png()
        .toFile(`./public/icon-${size}x${size}.png`);
      
      console.log(`✅ Generated icon-${size}x${size}.png`);
    }
    
    // Générer le badge (monochrome pour les notifications)
    const BADGE_SVG = `
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="white" rx="20"/>
  <ellipse cx="50" cy="45" rx="28" ry="32" fill="black" />
  <ellipse cx="50" cy="55" rx="18" ry="14" fill="white" />
</svg>
    `;
    
    fs.writeFileSync('/tmp/badge.svg', BADGE_SVG);
    
    await sharp('/tmp/badge.svg')
      .resize(72, 72)
      .png()
      .toFile('./public/badge-72x72.png');
    
    console.log('✅ Generated badge-72x72.png');
    
    // Nettoyer
    fs.unlinkSync('/tmp/cauris.svg');
    fs.unlinkSync('/tmp/badge.svg');
    
    console.log('\n🎉 All icons generated successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateIcons();