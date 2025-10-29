// Quick test of Handwrite.io API
const HANDWRITEIO_API_KEY = 'live_hw_6af124f7dba6bef4756d';
const BASE_URL = 'https://api.handwrite.io/v1';

async function testHandwriteIO() {
  console.log('Testing Handwrite.io API connection...\n');

  try {
    // Test 1: Get handwriting styles
    console.log('1. Fetching handwriting styles...');
    const stylesResponse = await fetch(`${BASE_URL}/handwriting`, {
      headers: {
        'Authorization': HANDWRITEIO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!stylesResponse.ok) {
      console.error(`❌ Failed: ${stylesResponse.status} ${stylesResponse.statusText}`);
      const errorText = await stylesResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const styles = await stylesResponse.json();
    console.log(`✓ Success! Found ${styles.length} handwriting styles`);
    if (styles.length > 0) {
      console.log(`  First style: ${styles[0].name || styles[0]._id}`);
    }

    // Test 2: Get cards/stationery
    console.log('\n2. Fetching cards/stationery...');
    const cardsResponse = await fetch(`${BASE_URL}/stationery`, {
      headers: {
        'Authorization': HANDWRITEIO_API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!cardsResponse.ok) {
      console.error(`❌ Failed: ${cardsResponse.status} ${cardsResponse.statusText}`);
      const errorText = await cardsResponse.text();
      console.error('Error details:', errorText);
      return;
    }

    const cards = await cardsResponse.json();
    console.log(`✓ Success! Found ${cards.length} cards`);
    if (cards.length > 0) {
      console.log(`  First card: ${cards[0].name || cards[0]._id}`);
    }

    console.log('\n✅ Handwrite.io API is working correctly!');
    console.log('\nYour configured IDs:');
    console.log(`  Handwriting ID: 60c91c6310484500157abc86`);
    console.log(`  Card ID: 5dc3025bbc08d20016f1ec28`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testHandwriteIO();
