import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface VoucherCodeItem {
  code: string;
  type?: string;
  courseTitle?: string;
  unitTitle?: string;
  collectionTitle?: string;
  price?: number;
  viewLimit?: number;
}

export async function generateShareCodesPdfVouchers({
  codes,
  teacherName,
  appName = "MOL5SATY UNI",
  fileNamePrefix = "Share_Codes_Vouchers",
}: {
  codes: VoucherCodeItem[];
  teacherName: string;
  appName?: string;
  fileNamePrefix?: string;
}) {
  if (!codes || codes.length === 0) return;

  // Create temporary container element for HTML rendering
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '794px'; // Standard A4 width at 96 DPI
  container.style.backgroundColor = '#ffffff';
  container.style.padding = '24px';
  container.style.boxSizing = 'border-box';
  container.style.direction = 'rtl';
  container.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  document.body.appendChild(container);

  const CARDS_PER_PAGE = 6; // 2 columns x 3 rows per A4 page
  const totalPages = Math.ceil(codes.length / CARDS_PER_PAGE);

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  try {
    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      const pageCodes = codes.slice(pageIdx * CARDS_PER_PAGE, (pageIdx + 1) * CARDS_PER_PAGE);

      container.innerHTML = `
        <div style="width: 746px; min-height: 1050px; background: #ffffff; padding: 10px; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; font-family: system-ui, -apple-system, sans-serif;">
          <!-- Header Bar -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="background: #0f172a; color: #22c55e; font-weight: 900; font-size: 16px; padding: 6px 14px; border-radius: 12px; letter-spacing: 1px;">
                ${appName}
              </div>
              <span style="font-size: 11px; color: #64748b; font-weight: 700; display: flex; align-items: center;">
                شيت كروت الأكواد المطبوعة للقص والتوزيع
              </span>
            </div>

            <div style="text-align: left;">
              <div style="font-size: 13px; font-weight: 800; color: #0f172a;">
                أستاذ المادة: ${teacherName ? `د. ${teacherName}` : 'عضو هيئة التدريس'}
              </div>
              <div style="font-size: 10px; color: #64748b; font-weight: 600;">
                صفحة ${pageIdx + 1} من ${totalPages} • إجمالي ${codes.length} كود
              </div>
            </div>
          </div>

          <!-- Cards 2x3 Grid -->
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; align-content: start; flex: 1;">
            ${pageCodes.map((c) => {
              let rawScope = (c as any).scopeTitle || (
                c.type === 'unit' 
                  ? (`وحدة: ${c.unitTitle || 'وحدة دراسية'}`) 
                  : c.type === 'collection' 
                  ? (`باقة: ${c.collectionTitle || 'باقة مقررات'}`) 
                  : (`كورس: ${c.courseTitle || 'الكورس كامل'}`)
              );

              // Replace parentheses with clean dashes to prevent html2canvas RTL text scrambling
              const cleanScope = rawScope.replace(/\(/g, '- ').replace(/\)/g, '').trim();
              const scopeFontSize = cleanScope.length > 30 ? '8px' : cleanScope.length > 20 ? '9px' : '10px';
              
              const limitVal = c.allowedViews ?? c.viewLimit ?? 3;
              const viewLimitText = limitVal === 0 ? 'مشاهدات غير محدودة' : `${limitVal} مشاهدات مسموحة`;
              const priceText = c.price && c.price > 0 ? `${c.price} EGP` : 'مجاني Free';

              return `
                <div style="
                  border: 2px dashed #0284c7; 
                  border-radius: 16px; 
                  padding: 12px 14px; 
                  background: #f8fafc; 
                  position: relative; 
                  box-sizing: border-box; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: space-between; 
                  height: 310px;
                  box-shadow: inset 0 0 0 1px #e2e8f0;
                ">
                  <!-- Cut Guide Tag -->
                  <div style="position: absolute; top: -10px; right: 20px; background: #0284c7; color: #ffffff; font-size: 9px; font-weight: 800; padding: 2px 8px; border-radius: 6px; letter-spacing: 0.5px;">
                    ✂️ اقطع الكارت من هنا
                  </div>

                  <!-- Card Branding Header -->
                  <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 4px;">
                    <div>
                      <span style="font-size: 11px; font-weight: 900; background: #e0f2fe; color: #0369a1; padding: 3px 8px; border-radius: 8px;">
                        ${appName}
                      </span>
                    </div>
                    <div style="font-size: 10px; font-weight: 800; color: #334155;">
                      د. ${teacherName || 'الأستاذ'}
                    </div>
                  </div>

                  <!-- Prominent Code Box -->
                  <div style="
                    background: #0f172a; 
                    border: 2px solid #22c55e; 
                    border-radius: 12px; 
                    padding: 10px 8px; 
                    text-align: center; 
                    margin: 6px 0;
                    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
                  ">
                    <div style="font-size: 9px; font-weight: 700; color: #94a3b8; letter-spacing: 0.5px; margin-bottom: 2px;">
                      كود الوصول • SHARE CODE
                    </div>
                    <div style="font-family: monospace; font-size: 20px; font-weight: 900; color: #22c55e; letter-spacing: 3px; word-break: break-all;">
                      ${c.code}
                    </div>
                  </div>

                  <!-- Scope & Limit Metadata -->
                  <div style="background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 8px 10px; font-size: 10px; display: flex; flex-direction: column; gap: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px; gap: 6px;">
                      <span style="color: #64748b; font-weight: 700; flex-shrink: 0; white-space: nowrap;">المحتوى الخاص بالرمز:</span>
                      <span style="color: #0f172a; font-weight: 800; font-size: ${scopeFontSize}; text-align: left; line-height: 1.25; word-break: break-word; max-width: 185px;">
                        ${cleanScope}
                      </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 5px;">
                      <span style="color: #64748b; font-weight: 700;">عدد المشاهدات:</span>
                      <span style="color: #0284c7; font-weight: 800;">
                        ${viewLimitText}
                      </span>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <span style="color: #64748b; font-weight: 700;">السعر التقديري:</span>
                      <span style="color: #16a34a; font-weight: 900;">
                        ${priceText}
                      </span>
                    </div>
                  </div>

                  <!-- Card Footer Instruction -->
                  <div style="text-align: center; font-size: 8px; color: #64748b; font-weight: 600; padding-top: 2px;">
                    🔒 أدخل الرمز في خانة كود الوصول بصفحة المقرر على التطبيق
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Printable Footer Note -->
          <div style="border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 12px; display: flex; justify-content: space-between; font-size: 9px; color: #94a3b8; font-weight: 600;">
            <span>تم استخراج شيت الكروت تلقائياً عبر منصة ${appName}</span>
            <span>https://mol5saty.com</span>
          </div>
        </div>
      `;

      // Render container page canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const imgWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (pageIdx > 0) {
        pdf.addPage();
      }

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pageHeight));
    }

    pdf.save(`${fileNamePrefix}_${new Date().toISOString().split('T')[0]}.pdf`);
  } catch (err) {
    console.error("PDF generation failed:", err);
    throw err;
  } finally {
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
