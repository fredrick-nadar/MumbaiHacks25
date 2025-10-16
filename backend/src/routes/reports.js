const express = require('express');
const PDFDocument = require('pdfkit');

const { Transaction, TaxProfile } = require('../models');
const { generateAnalyticsSummary, generateReportHeroImage } = require('../services/ai/gemini');

const heroImageEnabled = process.env.REPORT_HERO_IMAGE === 'true';

const router = express.Router();

const OLD_REGIME_SLABS = [
  { min: 0, max: 250000, rate: 0 },
  { min: 250000, max: 500000, rate: 0.05 },
  { min: 500000, max: 1000000, rate: 0.20 },
  { min: 1000000, max: Infinity, rate: 0.30 },
];

const NEW_REGIME_SLABS = [
  { min: 0, max: 300000, rate: 0 },
  { min: 300000, max: 600000, rate: 0.05 },
  { min: 600000, max: 900000, rate: 0.10 },
  { min: 900000, max: 1200000, rate: 0.15 },
  { min: 1200000, max: 1500000, rate: 0.20 },
  { min: 1500000, max: Infinity, rate: 0.30 },
];

const calculateTax = (income, slabs) => {
  let tax = 0;
  let remainingIncome = income;

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;

    const taxableInThisSlab = Math.min(remainingIncome, slab.max - slab.min);
    tax += taxableInThisSlab * slab.rate;
    remainingIncome -= taxableInThisSlab;

    if (slab.max === Infinity) break;
  }

  return Math.round(tax);
};

const roundCurrency = (amount = 0) => Math.round(amount);

router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user._id;
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [monthlyStats, lastMonthStats, topCategories, trends, incomeTransactions] = await Promise.all([
      Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: currentMonth },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: { $abs: '$amount' } },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: lastMonth, $lt: currentMonth },
          },
        },
        {
          $group: {
            _id: '$type',
            total: { $sum: { $abs: '$amount' } },
          },
        },
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: currentMonth },
          },
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: { $abs: '$amount' } },
            type: { $first: '$type' },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId,
            date: { $gte: sixMonthsAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$date' },
              month: { $month: '$date' },
              type: '$type',
            },
            total: { $sum: { $abs: '$amount' } },
          },
        },
        {
          $group: {
            _id: {
              year: '$_id.year',
              month: '$_id.month',
            },
            income: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'credit'] }, '$total', 0],
              },
            },
            expenses: {
              $sum: {
                $cond: [{ $eq: ['$_id.type', 'debit'] }, '$total', 0],
              },
            },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]),
      Transaction.aggregate([
        {
          $match: {
            userId,
            type: 'credit',
          },
        },
        {
          $group: {
            _id: { $ifNull: ['$category', 'uncategorized'] },
            total: { $sum: { $abs: '$amount' } },
          },
        },
      ]),
    ]);

    const currentMonthIncome = monthlyStats.find((s) => s._id === 'credit')?.total || 0;
    const currentMonthExpenses = monthlyStats.find((s) => s._id === 'debit')?.total || 0;
    const monthlyNetFlow = currentMonthIncome - currentMonthExpenses;

    const lastMonthIncome = lastMonthStats.find((s) => s._id === 'credit')?.total || 0;
    const lastMonthExpenses = lastMonthStats.find((s) => s._id === 'debit')?.total || 0;

    const savingsRate = currentMonthIncome > 0 ? monthlyNetFlow / currentMonthIncome : 0;

    let healthScore = 50;
    if (currentMonthIncome > 50000) healthScore += 10;
    if (lastMonthIncome > 0 && currentMonthIncome >= lastMonthIncome) healthScore += 10;
    if (savingsRate > 0.2) healthScore += 20;
    else if (savingsRate > 0.1) healthScore += 10;
    healthScore = Math.min(healthScore, 100);

    // Tax simulation snapshot
    const assessmentYear = `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(-2)}`;
    let taxProfile = await TaxProfile.findOne({ userId, assessmentYear });

    if (!taxProfile) {
      taxProfile = new TaxProfile({ userId, assessmentYear });
    }

    const normalizedIncome = incomeTransactions.map((entry) => ({
      category: String(entry._id || '').toLowerCase(),
      total: entry.total || 0,
    }));

    const sumByCategories = (categories) => normalizedIncome
      .filter((entry) => categories.includes(entry.category))
      .reduce((acc, entry) => acc + entry.total, 0);

    const salaryIncomeFromTx = sumByCategories([
      'salary',
      'salary_income',
      'income_salary',
      'payroll',
      'bonus',
      'arrears',
    ]);
    const capitalGainsFromTx = sumByCategories([
      'capital_gain',
      'capital_gains',
      'capital',
      'investment_income',
      'equity',
      'stock',
      'stocks',
    ]);
    const totalIncomeFromTx = normalizedIncome.reduce((acc, entry) => acc + entry.total, 0);

    let salaryIncome = salaryIncomeFromTx;
    let capitalGains = Math.min(capitalGainsFromTx, totalIncomeFromTx);
    let otherIncome = Math.max(0, totalIncomeFromTx - salaryIncome - capitalGains);

    if (!salaryIncome && req.user?.annualIncome) {
      salaryIncome = req.user.annualIncome;
    }

    if (!salaryIncome && totalIncomeFromTx > 0) {
      salaryIncome = Math.max(0, totalIncomeFromTx - capitalGains);
      otherIncome = Math.max(0, totalIncomeFromTx - salaryIncome - capitalGains);
    }

    const capturedIncome = salaryIncome + otherIncome + capitalGains;
    if (totalIncomeFromTx > capturedIncome) {
      otherIncome += totalIncomeFromTx - capturedIncome;
    }

    taxProfile.salaryIncome = salaryIncome;
    taxProfile.otherIncome = otherIncome;
    taxProfile.capitalGains = capitalGains;
    await taxProfile.save();

    const grossIncome = salaryIncome + otherIncome + capitalGains;

    const oldRegimeDeductions = (taxProfile.section80C || 0) + (taxProfile.section80D || 0) + (taxProfile.section24B || 0) + (taxProfile.otherDeductions || 0);
    const oldRegimeTaxableIncome = Math.max(0, grossIncome - oldRegimeDeductions);
    const oldRegimeTax = calculateTax(oldRegimeTaxableIncome, OLD_REGIME_SLABS);
    const oldRegimeTotalTax = Math.round(oldRegimeTax * 1.04);

    const standardDeduction = Math.min(50000, taxProfile.salaryIncome || 0);
    const newRegimeTaxableIncome = Math.max(0, grossIncome - standardDeduction);
    const newRegimeTax = calculateTax(newRegimeTaxableIncome, NEW_REGIME_SLABS);
    const newRegimeTotalTax = Math.round(newRegimeTax * 1.04);

    const recommendedRegime = newRegimeTotalTax <= oldRegimeTotalTax ? 'new' : 'old';
    const taxSaved = Math.abs(oldRegimeTotalTax - newRegimeTotalTax);

    const snapshot = {
      summary: {
        income: roundCurrency(currentMonthIncome),
        expenses: roundCurrency(currentMonthExpenses),
        netFlow: roundCurrency(monthlyNetFlow),
        savingsRate: Math.round(savingsRate * 100),
        healthScore,
      },
      categories: topCategories.map((cat) => ({
        label: cat._id,
        amount: roundCurrency(cat.total),
        type: cat.type,
      })),
      trends: trends.map((row) => ({
        year: row._id.year,
        month: row._id.month,
        income: roundCurrency(row.income),
        expenses: roundCurrency(row.expenses),
      })),
      tax: {
        grossIncome: roundCurrency(grossIncome),
        oldRegimeTax: oldRegimeTotalTax,
        newRegimeTax: newRegimeTotalTax,
        taxSaved,
        recommendedRegime,
      },
    };

    const [narrative, heroImageBase64] = await Promise.all([
      generateAnalyticsSummary(snapshot),
      heroImageEnabled
        ? generateReportHeroImage({
            income: roundCurrency(currentMonthIncome),
            expenses: roundCurrency(currentMonthExpenses),
            taxSavings: taxSaved,
          })
        : Promise.resolve(null),
    ]);

    const narrativeParagraphs = (narrative || '')
      .split(/\n+/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);

    const filename = `taxwise-analytics-${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);

    // soft background
    doc.save();
    doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f8fafc');
    doc.restore();

    doc.save();
    const ribbonGradient = doc.linearGradient(
      doc.page.margins.left,
      doc.page.margins.top - 22,
      doc.page.width - doc.page.margins.right,
      doc.page.margins.top - 18
    );
    ribbonGradient.stop(0, '#38bdf8');
    ribbonGradient.stop(1, '#22c55e');
    doc.rect(
      doc.page.margins.left,
      doc.page.margins.top - 22,
      doc.page.width - doc.page.margins.left - doc.page.margins.right,
      4
    ).fill(ribbonGradient);
    doc.restore();

    const formatINR = (value) => `₹${roundCurrency(value).toLocaleString()}`;
    const availableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const recommendedRegimeLabel = recommendedRegime.toUpperCase();

    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(24).text('TaxWise Analytics Report');
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(11).fillColor('#475569');
    doc.text(`Prepared for ${req.user?.name || 'Workspace Partner'}`);
    doc.text(`Generated on ${new Date().toLocaleString()}`);
    doc.moveDown(0.8);

    if (heroImageBase64) {
      const heroBuffer = Buffer.from(heroImageBase64, 'base64');
      const imageOptions = {
        fit: [doc.page.width - doc.page.margins.left - doc.page.margins.right, 180],
        align: 'center',
        valign: 'center',
      };
      doc.image(heroBuffer, doc.page.margins.left, doc.y, imageOptions);
      doc.moveDown(0.8);
    }

    if (narrativeParagraphs.length) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('AI Narrative Insight');
      doc.moveDown(0.3);
      narrativeParagraphs.forEach((paragraph) => {
        doc.font('Helvetica').fontSize(11).fillColor('#334155');
        doc.text(`• ${paragraph}`, {
          indent: 6,
          width: availableWidth,
        });
        doc.moveDown(0.2);
      });
      doc.moveDown(0.6);
    }

    const metricCards = [
      {
        title: 'Monthly income',
        value: formatINR(currentMonthIncome),
        caption: `Up ${lastMonthIncome ? (((currentMonthIncome - lastMonthIncome) / Math.max(lastMonthIncome, 1)) * 100).toFixed(1) : '0.0'}% vs prev. month`,
        accent: '#0ea5e9',
      },
      {
        title: 'Monthly outflow',
        value: formatINR(currentMonthExpenses),
        caption: `Down ${lastMonthExpenses ? (((lastMonthExpenses - currentMonthExpenses) / Math.max(lastMonthExpenses, 1)) * 100).toFixed(1) : '0.0'}% vs prev. month`,
        accent: '#f97316',
      },
      {
        title: 'Net cash flow',
        value: formatINR(monthlyNetFlow),
        caption: `Savings rate ${(savingsRate * 100).toFixed(1)}%`,
        accent: monthlyNetFlow >= 0 ? '#22c55e' : '#ef4444',
      },
      {
        title: 'Health score',
        value: `${healthScore}/100`,
        caption: recommendedRegime === 'new' ? 'New regime favoured on latest data' : 'Old regime still optimal',
        accent: '#6366f1',
      },
    ];

    const cardWidth = (availableWidth - 30) / 2;
    const cardHeight = 96;
    let cardX = doc.page.margins.left;
    const cardsStartY = doc.y;
    let cardY = cardsStartY;

    metricCards.forEach((card, index) => {
      doc.save();
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 16).fill('#ffffff');
      doc.rect(cardX, cardY, cardWidth, 6).fill(card.accent);
      doc.restore();

      doc.fillColor('#64748b').font('Helvetica').fontSize(10).text(card.title.toUpperCase(), cardX + 16, cardY + 14);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(21).text(card.value, cardX + 16, cardY + 32, {
        width: cardWidth - 32,
      });
      doc.fillColor('#475569').font('Helvetica').fontSize(10).text(card.caption, cardX + 16, cardY + 58, {
        width: cardWidth - 32,
      });

      if (card.recommended) {
        doc.save();
        doc.roundedRect(cardX + cardWidth - 70, cardY + 12, 54, 16, 8).fill('#ecfeff');
        doc.restore();
        doc.fillColor('#0284c7').font('Helvetica-Bold').fontSize(8).text('Preferred', cardX + cardWidth - 63, cardY + 16);
      }

      if (index % 2 === 0) {
        cardX += cardWidth + 30;
      } else {
        cardX = doc.page.margins.left;
        cardY += cardHeight + 14;
      }
    });

    const cardRows = Math.ceil(metricCards.length / 2);
    doc.y = cardsStartY + cardRows * (cardHeight + 14) + 12;
    doc.moveDown(0.6);

    if (topCategories.length) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('Top Spending Segments');
      doc.moveDown(0.3);
      topCategories.forEach((cat, index) => {
        const label = cat._id || 'Category';
        const catColor = cat.type === 'credit' ? '#0ea5e9' : '#f97316';
        const lineY = doc.y + 10;
        doc.save();
        doc.circle(doc.page.margins.left + 6, lineY, 4).fill(catColor);
        doc.restore();
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(11).text(`${index + 1}. ${label}`, doc.page.margins.left + 16, doc.y, {
          continued: true,
        });
        doc.fillColor('#475569').font('Helvetica').fontSize(10).text(`  ${formatINR(cat.total)} · ${cat.type === 'credit' ? 'Inflow' : 'Outflow'}`);
        doc.moveDown(0.2);
      });
      doc.moveDown(0.6);
    }

    if (trends.length) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('Six-Month Momentum');
      doc.moveDown(0.3);
      const labelColumnWidth = 60;
      const valueColumnWidth = 110;
      const barWidth = Math.max(120, availableWidth - labelColumnWidth - valueColumnWidth - 20);
      const barStartX = doc.page.margins.left + labelColumnWidth + 10;
      const baseY = doc.y;
      const maxTrendValue = trends.reduce((max, row) => Math.max(max, row.income || 0, row.expenses || 0, max), 1);

      trends.forEach((row) => {
        const monthLabel = `${row._id.month.toString().padStart(2, '0')}/${row._id.year}`;
        const rowY = doc.y;
        const incomeWidth = Math.max(6, Math.round(((row.income || 0) / maxTrendValue) * barWidth));
        const expenseWidth = Math.max(6, Math.round(((row.expenses || 0) / maxTrendValue) * barWidth));

        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(monthLabel, doc.page.margins.left, rowY);
        doc.save();
        doc.fillColor('#0ea5e9').roundedRect(barStartX, rowY, incomeWidth, 8, 4).fill();
        doc.fillColor('#f97316').roundedRect(barStartX, rowY + 10, expenseWidth, 8, 4).fill();
        doc.restore();
        doc.fillColor('#475569').font('Helvetica').fontSize(9).text(
          `${formatINR(row.income)} / ${formatINR(row.expenses)}`,
          barStartX + barWidth + 6,
          rowY
        );
        doc.y = rowY + 24;
      });
      doc.moveDown(0.4);
    }

    doc.font('Helvetica-Bold').fontSize(13).fillColor('#0f172a').text('Tax Optimisation Snapshot');
    doc.moveDown(0.4);

    const taxCards = [
      {
        label: 'Old regime',
        amount: oldRegimeTotalTax,
        caption: `Deductions applied ${formatINR(oldRegimeDeductions)}`,
        accent: '#f97316',
        delta: oldRegimeTotalTax - newRegimeTotalTax,
        recommended: recommendedRegime === 'old',
      },
      {
        label: 'New regime',
        amount: newRegimeTotalTax,
        caption: `Includes standard deduction ${formatINR(standardDeduction)}`,
        accent: '#38bdf8',
        delta: newRegimeTotalTax - oldRegimeTotalTax,
        recommended: recommendedRegime === 'new',
      },
    ];

    const taxCardWidth = (availableWidth - 20) / 2;
    const taxCardHeight = 110;
    let taxX = doc.page.margins.left;
    const taxY = doc.y;

    taxCards.forEach((card) => {
      doc.save();
      doc.roundedRect(taxX, taxY, taxCardWidth, taxCardHeight, 16).fill('#ffffff');
      doc.rect(taxX, taxY, taxCardWidth, 6).fill(card.accent);
      doc.restore();

      doc.fillColor('#64748b').font('Helvetica').fontSize(10).text(card.label.toUpperCase(), taxX + 16, taxY + 14);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(22).text(formatINR(card.amount), taxX + 16, taxY + 34);
      doc.fillColor('#475569').font('Helvetica').fontSize(10).text(card.caption, taxX + 16, taxY + 64, {
        width: taxCardWidth - 32,
      });

      const deltaLabel = card.delta === 0
        ? 'Parity with alternative'
        : `${card.delta < 0 ? 'Lower by' : 'Higher by'} ${formatINR(Math.abs(card.delta))}`;
      doc.fillColor(card.delta <= 0 ? '#15803d' : '#b91c1c')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text(deltaLabel, taxX + 16, taxY + 84, { width: taxCardWidth - 32 });

      if (card.recommended) {
        doc.save();
        doc.roundedRect(taxX + taxCardWidth - 86, taxY + 16, 70, 18, 8).fill('#dcfce7');
        doc.restore();
        doc.fillColor('#15803d').font('Helvetica-Bold').fontSize(9).text('Recommended', taxX + taxCardWidth - 80, taxY + 20);
      }

      taxX += taxCardWidth + 20;
    });

    doc.y = taxY + taxCardHeight + 18;
    doc.font('Helvetica').fontSize(11).fillColor('#334155');
    doc.text(`Recommendation: ${recommendedRegimeLabel} regime. Potential savings ${formatINR(taxSaved)}.`);
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(10).fillColor('#64748b');
    doc.text('Latest filing window analysed with TaxWise automation. Re-run reports after new ledger uploads for refreshed insights.');

    doc.end();
  } catch (error) {
    console.error('Analytics report generation failed', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to generate analytics report',
      error: error.message,
    });
  }
});

module.exports = router;
