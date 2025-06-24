import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MoneyRecord } from './database';

export interface ExportData {
  records: MoneyRecord[];
  totalAmount: number;
  exportDate: string;
  recordCount: number;
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const exportToExcel = async (data: ExportData): Promise<boolean> => {
  try {
    // Tạo workbook mới
    const workbook = XLSX.utils.book_new();

    // Chuẩn bị dữ liệu summary
    const summaryData = [
      ['Báo cáo dữ liệu CoinCard'],
      ['Ngày xuất:', data.exportDate],
      ['Tổng số bản ghi:', data.recordCount],
      ['Tổng số tiền:', formatCurrency(data.totalAmount)],
      [], // Dòng trống
    ];

    // Chuẩn bị header cho bảng dữ liệu
    const headers = [
      'STT',
      'Người nhận',
      'Số tiền',
      'Số tiền (định dạng)',
      'Ngày tạo',
      'Hashtags'
    ];

    // Chuẩn bị dữ liệu records
    const recordsData = data.records.map((record, index) => [
      index + 1, // STT
      record.recipient,
      record.amount,
      formatCurrency(record.amount),
      formatDate(record.createdAt),
      record.hashtags ? record.hashtags.join(', ') : ''
    ]);

    // Kết hợp tất cả dữ liệu
    const allData = [
      ...summaryData,
      headers,
      ...recordsData
    ];

    // Tạo worksheet
    const worksheet = XLSX.utils.aoa_to_sheet(allData);

    // Thiết lập độ rộng cột
    const columnWidths = [
      { wch: 5 },  // STT
      { wch: 20 }, // Người nhận
      { wch: 15 }, // Số tiền
      { wch: 20 }, // Số tiền (định dạng)
      { wch: 20 }, // Ngày tạo
      { wch: 30 }, // Hashtags
    ];
    worksheet['!cols'] = columnWidths;

    // Merge cells cho tiêu đề
    worksheet['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Merge tiêu đề
    ];

    // Thêm worksheet vào workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'CoinCard Records');

    // Tạo file Excel
    const wbout = XLSX.write(workbook, {
      type: 'base64',
      bookType: 'xlsx'
    });

    // Tạo tên file với timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `CoinCard_Export_${timestamp}.xlsx`;
    const fileUri = FileSystem.documentDirectory + filename;

    // Ghi file
    await FileSystem.writeAsStringAsync(fileUri, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Chia sẻ file
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Xuất dữ liệu CoinCard',
        UTI: 'com.microsoft.excel.xlsx'
      });
    }

    return true;
  } catch (error) {
    console.error('Lỗi khi xuất Excel:', error);
    return false;
  }
};

// Hàm để tạo dữ liệu export từ records
export const prepareExportData = (records: MoneyRecord[]): ExportData => {
  const totalAmount = records.reduce((sum, record) => sum + record.amount, 0);
  const exportDate = new Date().toLocaleString('vi-VN');
  
  return {
    records,
    totalAmount,
    exportDate,
    recordCount: records.length
  };
};
