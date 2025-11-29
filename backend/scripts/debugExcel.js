require('dotenv').config();
const XLSX = require('xlsx');
const path = require('path');

// Pass the Excel file path as an argument
const filePath = process.argv[2];

if (!filePath) {
  console.error('❌ Please provide the Excel file path');
  console.log('Usage: node scripts/debugExcel.js <path-to-file.xlsx>');  process.exit(1);
}

console.log('📂 Reading file:', filePath);

try {
  const workbook = XLSX.readFile(filePath, {
    cellDates: true,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames?.[0];
  if (!firstSheetName) {
    console.error('❌ No sheets found in the workbook');
    process.exit(1);
  }

  console.log('📊 Sheet name:', firstSheetName);

  const sheet = workbook.Sheets[firstSheetName];
  const records = XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    blankrows: false,
    raw: false,
  });

  console.log('📝 Total rows found:', records.length);

  if (records.length === 0) {
    console.error('❌ No data rows found');
    process.exit(1);
  }

  // Show first row to understand column names
  console.log('\n📋 Column names (from first row):');
  const columnNames = Object.keys(records[0]);
  columnNames.forEach((col, idx) => {
    console.log(`  ${idx + 1}. "${col}"`);
  });

  // Show first 3 records as samples
  console.log('\n📄 Sample data (first 3 rows):');
  records.slice(0, 3).forEach((record, idx) => {
    console.log(`\nRow ${idx + 1}:`);
    Object.entries(record).forEach(([key, value]) => {
      console.log(`  "${key}": "${value}" (type: ${typeof value})`);
    });
  });

  // Check what the parser would detect
  console.log('\n🔍 Parsing check for first row:');
  const record = records[0];
  
  const dateValue = record.Date || record.date || record['Transaction Date'] || record['Txn Date'] || record['Value Date'] || record.Month;
  const descriptionValue = record.Description || record.description || record.Narration || record.narration || record.Particulars || record['Transaction Details'] || record.Category || record.category;
  const transactionTypeValue = record.transaction_type || record['Transaction Type'] || record.Type || record.type || null;
  const debitValue = record['Debit Amount'] || record.Debit || record.debit || record['Withdrawal Amt'] || record['Withdrawal'] || record.Outflow || record.outflow;
  const creditValue = record['Credit Amount'] || record.Credit || record.credit || record['Deposit Amt'] || record['Deposit'] || record.Inflow || record.inflow;
  const genericAmount = record.Amount || record.amount || record['Transaction Amount'] || record['Txn Amount'];

  console.log(`  Date detected: "${dateValue}" (${dateValue ? '✅' : '❌'})`);
  console.log(`  Description detected: "${descriptionValue}" (${descriptionValue ? '✅' : '❌'})`);
  console.log(`  Type detected: "${transactionTypeValue}" (${transactionTypeValue ? '✅' : '❌'})`);
  console.log(`  Debit detected: "${debitValue}" (${debitValue ? '✅' : '❌'})`);
  console.log(`  Credit detected: "${creditValue}" (${creditValue ? '✅' : '❌'})`);
  console.log(`  Generic Amount detected: "${genericAmount}" (${genericAmount ? '✅' : '❌'})`);

  console.log('\n💡 Recommendations:');
  if (!dateValue) {
    console.log('  ⚠️  No date column detected. Expected columns: Date, date, Transaction Date, Txn Date, Value Date, Month');
  }
  if (!descriptionValue) {
    console.log('  ⚠️  No description column detected. Expected columns: Description, description, Narration, Particulars, Transaction Details, Category');
  }
  if (!debitValue && !creditValue && !genericAmount) {
    console.log('  ⚠️  No amount column detected. Expected columns: Amount, Debit Amount, Credit Amount, Inflow, Outflow');
  }

} catch (error) {
  console.error('❌ Error reading file:', error.message);
  process.exit(1);
}
