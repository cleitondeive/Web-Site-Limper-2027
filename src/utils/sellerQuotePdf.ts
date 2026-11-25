import { jsPDF } from 'jspdf';
import { SellerQuote, StoreSettings } from '../types/commerce';
import {
  formatBrDateFromYmd,
  formatCurrency,
  formatSellerQuotePaymentSummary,
} from './commerce';

function sanitizeFilename(raw: string): string {
  return raw
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 32) || 'ORC';
}

export function buildSellerQuotePdfDocument(
  quote: SellerQuote,
  settings: StoreSettings
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;
  const hidePrices = Boolean(quote.hidePrices);
  const paymentSummary = formatSellerQuotePaymentSummary(quote);

  // --- 1. BRANDED EXECUTIVE HEADER ---
  doc.setFillColor(24, 24, 27); // #18181B
  doc.rect(0, 0, pageWidth, 34, 'F');
  doc.setFillColor(255, 190, 0); // #FFBE00 gold accent stripe
  doc.rect(0, 34, pageWidth, 2.5, 'F');

  doc.setTextColor(255, 190, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text((settings.storeName || 'LIMPER MT').toUpperCase(), marginX, 14);

  doc.setTextColor(228, 228, 231);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('PRODUTOS DE LIMPEZA PROFISSIONAL, AUTOMOTIVA & DOMESTICA', marginX, 20);
  doc.text(
    `${settings.storeAddress || 'Av. Couto Magalhaes, 2820 - Varzea Grande/MT'}`,
    marginX,
    25.5
  );
  doc.text(
    `WhatsApp Oficial: ${settings.whatsappDisplay || '(65) 3029-6824'}`,
    marginX,
    30.5
  );

  // Right quote badge in header
  doc.setFillColor(39, 39, 42);
  doc.roundedRect(pageWidth - marginX - 60, 7, 60, 21, 2.5, 2.5, 'F');
  doc.setTextColor(255, 190, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(
    hidePrices ? 'ORCAMENTO SOB CONSULTA' : 'ORCAMENTO COMERCIAL',
    pageWidth - marginX - 30,
    13,
    { align: 'center' }
  );
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.text(quote.id, pageWidth - marginX - 30, 20.5, { align: 'center' });
  doc.setTextColor(212, 212, 216);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const validBr = quote.validUntilDate
    ? formatBrDateFromYmd(quote.validUntilDate)
    : 'A combinar';
  doc.text(`Validade: ${validBr}`, pageWidth - marginX - 30, 25.5, { align: 'center' });

  let cursorY = 44;

  // --- 2. METADATA & CUSTOMER GRID ---
  const emissionStr = new Date(quote.createdAt).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const leftCardW = contentWidth * 0.56;
  const rightCardW = contentWidth * 0.42;
  const rightCardX = marginX + leftCardW + contentWidth * 0.02;

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(marginX, cursorY, leftCardW, 36, 2, 2, 'FD');
  doc.roundedRect(rightCardX, cursorY, rightCardW, 36, 2, 2, 'FD');

  doc.setTextColor(227, 38, 46); // #E3262E
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DADOS DO CLIENTE', marginX + 4, cursorY + 6);

  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(quote.customerName.slice(0, 48), marginX + 4, cursorY + 12.5);

  doc.setTextColor(63, 63, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  const customerLines: string[] = [];
  if (quote.customerCompany?.trim()) {
    customerLines.push(`Empresa: ${quote.customerCompany.trim()}`);
  }
  if (quote.customerDocument?.trim()) {
    customerLines.push(`CPF/CNPJ: ${quote.customerDocument.trim()}`);
  }
  if (quote.customerPhone?.trim()) {
    customerLines.push(`Telefone/WhatsApp: ${quote.customerPhone.trim()}`);
  }
  if (quote.customerCity?.trim()) {
    customerLines.push(`Cidade: ${quote.customerCity.trim()}`);
  }
  if (customerLines.length === 0) {
    customerLines.push('Atendimento comercial direto via Area do Vendedor.');
  }
  customerLines.slice(0, 4).forEach((line, idx) => {
    doc.text(line.slice(0, 56), marginX + 4, cursorY + 18 + idx * 4.5);
  });

  // Right card: Seller & Conditions
  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ATENDIMENTO & PAGAMENTO', rightCardX + 4, cursorY + 6);

  doc.setTextColor(24, 24, 27);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(`Vendedor: ${quote.sellerName}`.slice(0, 38), rightCardX + 4, cursorY + 12.5);

  doc.setTextColor(63, 63, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Emissao: ${emissionStr}`, rightCardX + 4, cursorY + 17.5);
  doc.text(
    `Entrega: ${quote.deliveryType === 'pickup' ? 'Retirada no Balcao' : 'Delivery Limper MT'}`,
    rightCardX + 4,
    cursorY + 22.3
  );
  const pgtoLines = (
    doc.splitTextToSize(`Pgto: ${paymentSummary}`, rightCardW - 8) as string[]
  ).slice(0, 2);
  pgtoLines.forEach((line, idx) => {
    doc.text(line, rightCardX + 4, cursorY + 27.1 + idx * 4.2);
  });

  cursorY += 43;

  // --- 3. ITEMIZED PRODUCTS TABLE ---
  const drawTableHeader = (y: number) => {
    doc.setFillColor(24, 24, 27);
    doc.roundedRect(marginX, y, contentWidth, 8, 1.5, 1.5, 'F');
    doc.setTextColor(255, 190, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('#', marginX + 3, y + 5.3);
    doc.text('SKU', marginX + 11, y + 5.3);
    doc.text('PRODUTO / DESCRICAO', marginX + 32, y + 5.3);
    if (hidePrices) {
      doc.text('QTD', marginX + 144, y + 5.3, { align: 'right' });
      doc.text('SITUACAO', marginX + contentWidth - 3, y + 5.3, { align: 'right' });
    } else {
      doc.text('QTD', marginX + 124, y + 5.3, { align: 'right' });
      doc.text('VLR. UNIT.', marginX + 151, y + 5.3, { align: 'right' });
      doc.text('SUBTOTAL', marginX + contentWidth - 3, y + 5.3, { align: 'right' });
    }
    return y + 10;
  };

  cursorY = drawTableHeader(cursorY);

  quote.items.forEach((item, index) => {
    const descFull = item.volumeLabel
      ? `${item.title} (${item.volumeLabel})`
      : item.title;
    const descMaxW = hidePrices ? 102 : 84;
    const wrappedDesc = doc.splitTextToSize(descFull, descMaxW) as string[];
    const wrappedNote = item.itemNote?.trim()
      ? (doc.splitTextToSize(`Obs.: ${item.itemNote.trim()}`, descMaxW) as string[]).slice(0, 2)
      : [];
    const textLinesCount = wrappedDesc.length + wrappedNote.length;
    const rowHeight = Math.max(7.8, textLinesCount * 4.1 + 3.4);

    if (cursorY + rowHeight > pageHeight - 54) {
      doc.addPage();
      cursorY = 18;
      cursorY = drawTableHeader(cursorY);
    }

    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(marginX, cursorY - 1, contentWidth, rowHeight, 'F');
    }

    doc.setDrawColor(236, 236, 239);
    doc.line(marginX, cursorY + rowHeight - 1, marginX + contentWidth, cursorY + rowHeight - 1);

    doc.setTextColor(113, 113, 122);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(String(index + 1).padStart(2, '0'), marginX + 3, cursorY + 4);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(82, 82, 91);
    doc.text((item.sku || 'AVULSO').slice(0, 11), marginX + 11, cursorY + 4);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(24, 24, 27);
    wrappedDesc.forEach((line, lIdx) => {
      doc.text(line, marginX + 32, cursorY + 4 + lIdx * 4.1);
    });

    if (wrappedNote.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(113, 113, 122);
      wrappedNote.forEach((line, nIdx) => {
        doc.text(
          line,
          marginX + 32,
          cursorY + 4 + (wrappedDesc.length + nIdx) * 4.1
        );
      });
    }

    if (hidePrices) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(24, 24, 27);
      doc.text(`${item.quantity}x`, marginX + 144, cursorY + 4, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text('Sob consulta', marginX + contentWidth - 3, cursorY + 4, { align: 'right' });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(24, 24, 27);
      doc.text(`${item.quantity}x`, marginX + 124, cursorY + 4, { align: 'right' });

      doc.setFont('helvetica', 'normal');
      doc.text(formatCurrency(item.unitPrice), marginX + 151, cursorY + 4, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(24, 24, 27);
      doc.text(formatCurrency(item.subtotal), marginX + contentWidth - 3, cursorY + 4, {
        align: 'right',
      });
    }

    cursorY += rowHeight;
  });

  cursorY += 5;

  // Ensure enough room for totals + notes + footer
  if (cursorY > pageHeight - 70) {
    doc.addPage();
    cursorY = 20;
  }

  // --- 4. TOTALS SUMMARY & NOTES ---
  const notesW = contentWidth * 0.54;
  const totalsW = contentWidth * 0.43;
  const totalsX = marginX + notesW + contentWidth * 0.03;
  const boxH = 38;

  // Left: Commercial Observations & PIX info
  doc.setFillColor(255, 251, 235); // #FFFBEB
  doc.setDrawColor(253, 230, 138); // #FDE68A
  doc.roundedRect(marginX, cursorY, notesW, boxH, 2, 2, 'FD');

  doc.setTextColor(180, 83, 9);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('OBSERVACOES COMERCIAIS & PAGAMENTO', marginX + 4, cursorY + 6);

  doc.setTextColor(63, 63, 70);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const obsText = quote.notes?.trim()
    ? quote.notes.trim()
    : 'Valores sujeitos a confirmacao de disponibilidade em estoque. Retirada expressa em 15min no balcao ou entrega agendada.';
  const obsLines = (doc.splitTextToSize(obsText, notesW - 8) as string[]).slice(0, 4);
  obsLines.forEach((line, idx) => {
    doc.text(line, marginX + 4, cursorY + 12 + idx * 4.2);
  });
  if (settings.pixKey && !hidePrices) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text(
      `PIX (${settings.pixKeyType}): ${settings.pixKey}`.slice(0, 52),
      marginX + 4,
      cursorY + 34
    );
  }

  // Right: Totals Card (or Hidden Prices "Sob Consulta" Card)
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(228, 228, 231);
  doc.roundedRect(totalsX, cursorY, totalsW, boxH, 2, 2, 'FD');

  if (hidePrices) {
    const totalUnits = quote.items.reduce((sum, i) => sum + i.quantity, 0);
    doc.setTextColor(180, 83, 9);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ORCAMENTO SEM EXIBICAO DE PRECO', totalsX + 4, cursorY + 8);

    doc.setTextColor(63, 63, 70);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.text(
      `Itens listados: ${quote.items.length} produto(s) · ${totalUnits} unidade(s)`,
      totalsX + 4,
      cursorY + 14.5
    );
    const hiddenPayLines = (
      doc.splitTextToSize(`Pagamento: ${paymentSummary}`, totalsW - 8) as string[]
    ).slice(0, 2);
    hiddenPayLines.forEach((l, i) => {
      doc.text(l, totalsX + 4, cursorY + 19.5 + i * 4.2);
    });

    doc.setFillColor(24, 24, 27);
    doc.roundedRect(totalsX + 2, cursorY + 27, totalsW - 4, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 190, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('VALORES SOB CONSULTA', totalsX + totalsW / 2, cursorY + 33, {
      align: 'center',
    });
  } else {
    doc.setTextColor(82, 82, 91);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    doc.text('Subtotal dos itens:', totalsX + 4, cursorY + 7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text(formatCurrency(quote.subtotal), totalsX + totalsW - 4, cursorY + 7, {
      align: 'right',
    });

    const discountLabel =
      quote.discountType === 'fixed'
        ? `Desconto (R$ / ${quote.discountPercent}%):`
        : `Desconto (${quote.discountPercent}%):`;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 91);
    doc.text(discountLabel, totalsX + 4, cursorY + 12.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(
      quote.discountAmount > 0 ? 22 : 113,
      quote.discountAmount > 0 ? 163 : 113,
      quote.discountAmount > 0 ? 74 : 122
    );
    doc.text(
      quote.discountAmount > 0 ? `-${formatCurrency(quote.discountAmount)}` : 'R$ 0,00',
      totalsX + totalsW - 4,
      cursorY + 12.5,
      { align: 'right' }
    );

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 91);
    doc.text('Entrega / Frete:', totalsX + 4, cursorY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(24, 24, 27);
    doc.text(
      quote.deliveryFee > 0 ? formatCurrency(quote.deliveryFee) : 'Gratis / A combinar',
      totalsX + totalsW - 4,
      cursorY + 18,
      { align: 'right' }
    );

    // Highlighted Grand Total bar
    doc.setFillColor(24, 24, 27);
    doc.roundedRect(totalsX + 2, cursorY + 21.5, totalsW - 4, 9, 1.5, 1.5, 'F');
    doc.setTextColor(255, 190, 0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.text('TOTAL GERAL:', totalsX + 5, cursorY + 27.4);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10.5);
    doc.text(formatCurrency(quote.total), totalsX + totalsW - 5, cursorY + 27.4, {
      align: 'right',
    });

    // Installment line below grand total bar
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(63, 63, 70);
    doc.text(
      paymentSummary.slice(0, 48),
      totalsX + totalsW / 2,
      cursorY + 35,
      { align: 'center' }
    );
  }

  // --- 5. FOOTER ---
  const footerY = pageHeight - 14;
  doc.setDrawColor(228, 228, 231);
  doc.line(marginX, footerY - 4, pageWidth - marginX, footerY - 4);
  doc.setTextColor(113, 113, 122);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(
    `${settings.storeName || 'Limper MT'} · ${settings.storeAddress} · WhatsApp: ${settings.whatsappDisplay}`,
    pageWidth / 2,
    footerY,
    { align: 'center' }
  );
  doc.text(
    `Documento gerado pela Area do Vendedor (${quote.sellerName}) · Valido ate ${validBr}`,
    pageWidth / 2,
    footerY + 4,
    { align: 'center' }
  );

  return doc;
}

export function downloadSellerQuotePdf(
  quote: SellerQuote,
  settings: StoreSettings
): string {
  const doc = buildSellerQuotePdfDocument(quote, settings);
  const fileName = `Orcamento-LimperMT-${sanitizeFilename(quote.id)}.pdf`;
  doc.save(fileName);
  return fileName;
}
