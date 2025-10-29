/**
 * Script to fetch available handwriting styles and cards from Handwrite.io API
 * Run with: npx ts-node --esm scripts/get-handwriteio-styles.ts
 */

const API_KEY = process.env.HANDWRITEIO_API_KEY || 'live_hw_6af124f7dba6bef4756d';
const BASE_URL = 'https://api.handwrite.io/v1';

async function fetchHandwritings() {
  console.log('Fetching available handwriting styles...\n');

  const response = await fetch(`${BASE_URL}/handwriting`, {
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch handwritings: ${response.statusText}`);
  }

  const handwritings = await response.json();

  console.log('Available Handwriting Styles:');
  console.log('============================\n');

  // Debug: Print first item to see structure
  if (handwritings.length > 0) {
    console.log('DEBUG - First item structure:', JSON.stringify(handwritings[0], null, 2));
    console.log('\n');
  }

  handwritings.forEach((style: any) => {
    const id = style.id || style._id || style.handwriting_id || 'N/A';
    console.log(`ID: ${id}`);
    console.log(`Name: ${style.name}`);
    console.log(`Preview: ${style.preview_url}`);
    console.log('---');
  });

  return handwritings;
}

async function fetchStationery() {
  console.log('\nFetching available stationery/cards...\n');

  const response = await fetch(`${BASE_URL}/stationery`, {
    headers: {
      'Authorization': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch stationery: ${response.statusText}`);
  }

  const stationery = await response.json();

  console.log('Available Cards/Stationery:');
  console.log('===========================\n');

  // Debug: Print first item to see structure
  if (stationery.length > 0) {
    console.log('DEBUG - First item structure:', JSON.stringify(stationery[0], null, 2));
    console.log('\n');
  }

  stationery.forEach((card: any) => {
    const id = card.id || card._id || card.card_id || card.stationery_id || 'N/A';
    console.log(`ID: ${id}`);
    console.log(`Name: ${card.name}`);
    console.log(`Size: ${card.size}`);
    console.log(`Preview: ${card.preview_url}`);
    console.log('---');
  });

  return stationery;
}

async function main() {
  try {
    const handwritings = await fetchHandwritings();
    const stationery = await fetchStationery();

    console.log('\n\n=== ENVIRONMENT VARIABLES ===\n');
    console.log(`HANDWRITEIO_DEFAULT_HANDWRITING_ID=${handwritings[0]?._id || 'REPLACE_ME'}`);
    console.log(`HANDWRITEIO_DEFAULT_CARD_ID=${stationery[0]?._id || 'REPLACE_ME'}`);
    console.log('\nCopy these to your .env.local file!\n');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
