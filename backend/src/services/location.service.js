const { Province, Regency, District, Op, Sequelize } = require('../models');

const ALIASES = {
  // Jabodetabek
  'jkt': 'JAKARTA',
  'cgk': 'JAKARTA', // Kode IATA (Cengkareng)
  'hlp': 'JAKARTA', // Kode IATA (Halim)
  'bgr': 'BOGOR',
  'dpk': 'DEPOK',
  'tng': 'TANGERANG',
  'bks': 'BEKASI',

  // Jawa Barat
  'bdg': 'BANDUNG',
  'bdo': 'BANDUNG', // Kode IATA
  'cbn': 'CIREBON',
  'tsm': 'TASIKMALAYA',

  // Jawa Tengah & DIY
  'smg': 'SEMARANG',
  'srg': 'SEMARANG', // Kode IATA
  'solo': 'SURAKARTA',
  'soc': 'SURAKARTA', // Kode IATA
  'slo': 'SURAKARTA',
  'ska': 'SURAKARTA',
  'jogja': 'YOGYAKARTA',
  'jogjakarta': 'YOGYAKARTA',
  'yogya': 'YOGYAKARTA',
  'yk': 'YOGYAKARTA',
  'jog': 'YOGYAKARTA', // Kode IATA
  'pwt': 'PURWOKERTO',
  'mgl': 'MAGELANG',

  // Jawa Timur
  'sub': 'SURABAYA',
  'sby': 'SURABAYA',
  'mlg': 'MALANG',
  'kediri': 'KEDIRI',
  'kdr': 'KEDIRI',
  'sda': 'SIDOARJO',
  'mjk': 'MOJOKERTO',

  // Bali & Nusa Tenggara
  'dps': 'DENPASAR',
  'bali': 'DENPASAR',
  'lbj': 'LABUAN BAJO',
  'mtr': 'MATARAM',
  'ami': 'MATARAM', // Kode IATA (Selaparang)
  'lop': 'PRAYA', // Kode IATA Lombok Praya
  'koe': 'KUPANG',

  // Sumatera
  'mdn': 'MEDAN',
  'mes': 'MEDAN', // Kode IATA lama (Polonia)
  'kno': 'MEDAN', // Kode IATA baru (Kualanamu)
  'btj': 'BANDA ACEH',
  'plm': 'PALEMBANG',
  'plg': 'PALEMBANG',
  'pdg': 'PADANG',
  'pku': 'PEKANBARU',
  'bth': 'BATAM',
  'tkg': 'BANDAR LAMPUNG',
  'pgk': 'PANGKAL PINANG',

  // Kalimantan
  'pnk': 'PONTIANAK',
  'bpp': 'BALIKPAPAN',
  'bpn': 'BALIKPAPAN', // Kode IATA
  'pky': 'PALANGKARAYA',
  'bdj': 'BANJARMASIN',
  'smr': 'SAMARINDA',
  'sri': 'SAMARINDA', // Kode IATA

  // Sulawesi, Maluku, & Papua
  'mks': 'MAKASSAR',
  'upg': 'MAKASSAR', // Kode IATA (Ujung Pandang)
  'mnd': 'MANADO',
  'mdc': 'MANADO', // Kode IATA
  'kdi': 'KENDARI',
  'plw': 'PALU',
  'amb': 'AMBON',
  'amq': 'AMBON', // Kode IATA
  'djj': 'JAYAPURA',
  'soq': 'SORONG',
};

class LocationService {
  
  /**
   * Detect location from text by matching against database tables
   * Priority: Regency (City) > Province > District
   */
  async detectLocation(text) {
    if (!text || text.length < 3) return null;
    
    const cleanText = text.trim().toLowerCase(); 

    try {
      // 0. Manual Aliases Check (Pre-DB)
      for (const [alias, target] of Object.entries(ALIASES)) {
        if (cleanText.includes(alias)) {
          // Find the regency that matches the target name
          const targetRegency = await Regency.findOne({
            where: {
              name: { [Sequelize.Op.like]: `%${target}%` }
            }
          });
          if (targetRegency) {
            return {
              type: 'REGENCY',
              id: targetRegency.id,
              name: targetRegency.name,
              provinceId: targetRegency.province_id,
              regencyId: targetRegency.id,
              fullString: targetRegency.name,
              matchedPart: alias
            };
          }
        }
      }

      // 1. Check Regencies (Cities/Kabupaten)
      // Custom matching: Remove "KOTA " or "KABUPATEN " from DB field for matching
      // user says "Surakarta", DB is "KOTA SURAKARTA". 
      // We check if cleanText contains "Surakarta"
      const matchedRegency = await Regency.findOne({
        where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.literal(`'${cleanText.replace(/'/g, "''")}'`)),
          { 
            [Sequelize.Op.like]: Sequelize.fn('CONCAT', '%', 
              Sequelize.fn('LOWER', 
                Sequelize.fn('REPLACE', 
                  Sequelize.fn('REPLACE', Sequelize.col('Regency.name'), 'KOTA ', ''),
                  'KABUPATEN ', ''
                )
              ), 
            '%') 
          }
        ),
        order: [[Sequelize.fn('LENGTH', Sequelize.col('Regency.name')), 'DESC']] 
      });

      if (matchedRegency) {
        return {
          type: 'REGENCY',
          id: matchedRegency.id,
          name: matchedRegency.name,
          provinceId: matchedRegency.province_id,
          regencyId: matchedRegency.id,
          fullString: matchedRegency.name,
          matchedPart: matchedRegency.name.replace('KOTA ', '').replace('KABUPATEN ', '').toLowerCase()
        };
      }

      // 2. Check Provinces
      const matchedProvince = await Province.findOne({
         where: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.literal(`'${cleanText.replace(/'/g, "''")}'`)),
          { [Sequelize.Op.like]: Sequelize.fn('CONCAT', '%', Sequelize.fn('LOWER', Sequelize.col('Province.name')), '%') }
        ),
        order: [[Sequelize.fn('LENGTH', Sequelize.col('Province.name')), 'DESC']]
      });

      if (matchedProvince) {
        return {
          type: 'PROVINCE',
          id: matchedProvince.id,
          name: matchedProvince.name,
          provinceId: matchedProvince.id,
          fullString: matchedProvince.name,
          matchedPart: matchedProvince.name.toLowerCase()
        };
      }

      // 3. District
      if (cleanText.split(' ').length > 0) {
        const matchedDistrict = await District.findOne({
           where: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.literal(`'${cleanText.replace(/'/g, "''")}'`)),
            { [Sequelize.Op.like]: Sequelize.fn('CONCAT', '%', Sequelize.fn('LOWER', Sequelize.col('District.name')), '%') }
          ),
          order: [[Sequelize.fn('LENGTH', Sequelize.col('District.name')), 'DESC']],
          include: ['regency']
        });

        if (matchedDistrict) {
          const locationName = matchedDistrict.regency 
            ? `${matchedDistrict.name}, ${matchedDistrict.regency.name}`
            : matchedDistrict.name;

          return {
            type: 'DISTRICT',
            id: matchedDistrict.id,
            name: locationName,
            provinceId: matchedDistrict.regency?.province_id,
            regencyId: matchedDistrict.regency_id,
            districtId: matchedDistrict.id,
            fullString: locationName,
            matchedPart: matchedDistrict.name.toLowerCase()
          };
        }
      }

      return null;
    } catch (error) {
      console.error('[LocationService] Detection Error:', error);
      return null;
    }
  }
}

module.exports = new LocationService();
