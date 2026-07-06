import { lazy } from 'react';

const EmojiTool = lazy(() => import('./EmojiTool.jsx'));
const DateTool = lazy(() => import('./DateTool.jsx'));
const CalendarScheduleTool = lazy(() => import('./CalendarScheduleTool.jsx'));
const GstTool = lazy(() => import('./GstTool.jsx'));
const CleanerTool = lazy(() => import('./CleanerTool.jsx'));
const OneLineTool = lazy(() => import('./OneLineTool.jsx'));
const InvoiceTool = lazy(() => import('./InvoiceTool.jsx'));
const CaseTool = lazy(() => import('./CaseTool.jsx'));
const WordCounterTool = lazy(() => import('./WordCounterTool.jsx'));
const ImageShrinkerTool = lazy(() => import('./ImageShrinkerTool.jsx'));
const HtmlViewerTool = lazy(() => import('./HtmlViewerTool.jsx'));
const JsonFormatterTool = lazy(() => import('./JsonFormatterTool.jsx'));
const ImageToPdfTool = lazy(() => import('./ImageToPdfTool.jsx'));
const PdfToImageTool = lazy(() => import('./PdfToImageTool.jsx'));
const CombinePdfTool = lazy(() => import('./CombinePdfTool.jsx'));
const WebsiteStatusTool = lazy(() => import('./WebsiteStatusTool.jsx'));
const InternetSpeedTool = lazy(() => import('./InternetSpeedTool.jsx'));
const HourlyRateTool = lazy(() => import('./HourlyRateTool.jsx'));
const ProfitMarginTool = lazy(() => import('./ProfitMarginTool.jsx'));
const SignPdfTool = lazy(() => import('./SignPdfTool.jsx'));
const TextToSpeechTool = lazy(() => import('./TextToSpeechTool.jsx'));
const AudioRecorderTool = lazy(() => import('./AudioRecorderTool.jsx'));
const LocationTool = lazy(() => import('./LocationTool.jsx'));
const SystemInfoTool = lazy(() => import('./SystemInfoTool.jsx'));
const CameraTool = lazy(() => import('./CameraTool.jsx'));
const PercentageTool = lazy(() => import('./PercentageTool.jsx'));
const UnitConverterTool = lazy(() => import('./UnitConverterTool.jsx'));
const ScamCheckerTool = lazy(() => import('./ScamCheckerTool.jsx'));
const LinkScamCheckerTool = lazy(() => import('./LinkScamCheckerTool.jsx'));
const QrScamCheckerTool = lazy(() => import('./QrScamCheckerTool.jsx'));
const SeoCheckerTool = lazy(() => import('./SeoCheckerTool.jsx'));
const CalculatorTool = lazy(() => import('./CalculatorTool.jsx'));
const UtcConverterTool = lazy(() => import('./UtcConverterTool.jsx'));
const TimeZoneConverterTool = lazy(() => import('./TimeZoneConverterTool.jsx'));
const QrCodeTool = lazy(() => import('./QrCodeTool.jsx'));
const QrTextTransferTool = lazy(() => import('./QrTextTransferTool.jsx'));
const LocalDeviceTransferTool = lazy(() => import('./LocalDeviceTransferTool.jsx'));
const BgRemoverTool = lazy(() => import('./BgRemoverTool.jsx'));
const FileViewerTool = lazy(() => import('./FileViewerTool.jsx'));
const FileConverterTool = lazy(() => import('./FileConverterTool.jsx'));
const SuggestTool = lazy(() => import('./SuggestTool.jsx'));
const ColourPickerTool = lazy(() => import('./ColourPickerTool.jsx'));
const PomodoroTool = lazy(() => import('./PomodoroTool.jsx'));
const DiffTool = lazy(() => import('./DiffTool.jsx'));
const RegexTesterTool = lazy(() => import('./RegexTesterTool.jsx'));
const UrlCoderTool = lazy(() => import('./UrlCoderTool.jsx'));
const ExifViewerTool = lazy(() => import('./ExifViewerTool.jsx'));
const CanvasFingerprintTool = lazy(() => import('./CanvasFingerprintTool.jsx'));
const TimerTool = lazy(() => import('./TimerTool.jsx'));
const StopwatchTool = lazy(() => import('./StopwatchTool.jsx'));
const MultiPageViewerTool = lazy(() => import('./MultiPageViewerTool.jsx'));
const ViewTesterTool = lazy(() => import('./ViewTesterTool.jsx'));
const UrlParamBuilderTool = lazy(() => import('./UrlParamBuilderTool.jsx'));
const WorkflowDiagramTool = lazy(() => import('./WorkflowDiagramTool.jsx'));
const QuickFormBuilderTool = lazy(() => import('./QuickFormBuilderTool.jsx'));
const WordPdfConverterTool = lazy(() => import('./WordPdfConverterTool.jsx'));
const MultiStopMapTool = lazy(() => import('./MultiStopMapTool.jsx'));
const PaymentRequestTool = lazy(() => import('./PaymentRequestTool.jsx'));
const SimpleInvoicePdfTool = lazy(() => import('./SimpleInvoicePdfTool.jsx'));
const SimpleQuotePdfTool = lazy(() => import('./SimpleQuotePdfTool.jsx'));
const SimpleReceiptPdfTool = lazy(() => import('./SimpleReceiptPdfTool.jsx'));
const PdfPageTool = lazy(() => import('./PdfPageTool.jsx'));
const QuickChecklistShareTool = lazy(() => import('./QuickChecklistShareTool.jsx'));
const TextExtractorTool = lazy(() => import('./TextExtractorTool.jsx'));

export const toolComponents = {
  emoji: EmojiTool,
  dates: DateTool,
  schedule: CalendarScheduleTool,
  gst: GstTool,
  cleaner: CleanerTool,
  oneline: OneLineTool,
  invoice: InvoiceTool,
  case: CaseTool,
  counter: WordCounterTool,
  shrinker: ImageShrinkerTool,
  html: HtmlViewerTool,
  json: JsonFormatterTool,
  imagepdf: ImageToPdfTool,
  pdfimage: PdfToImageTool,
  combinepdf: CombinePdfTool,
  webstatus: WebsiteStatusTool,
  speed: InternetSpeedTool,
  hourly: HourlyRateTool,
  margin: ProfitMarginTool,
  signpdf: SignPdfTool,
  tts: TextToSpeechTool,
  recorder: AudioRecorderTool,
  location: LocationTool,
  sysinfo: SystemInfoTool,
  camera: CameraTool,
  percent: PercentageTool,
  units: UnitConverterTool,
  scam: ScamCheckerTool,
  linkscam: LinkScamCheckerTool,
  qrscam: QrScamCheckerTool,
  seo: SeoCheckerTool,
  calc: CalculatorTool,
  utc: UtcConverterTool,
  tz: TimeZoneConverterTool,
  qr: QrCodeTool,
  textqr: QrTextTransferTool,
  localtransfer: LocalDeviceTransferTool,
  bgremove: BgRemoverTool,
  fileview: FileViewerTool,
  fileconv: FileConverterTool,
  suggest: SuggestTool,
  colour: ColourPickerTool,
  pomodoro: PomodoroTool,
  diff: DiffTool,
  regex: RegexTesterTool,
  urlcode: UrlCoderTool,
  exif: ExifViewerTool,
  canvas: CanvasFingerprintTool,
  timer: TimerTool,
  stopwatch: StopwatchTool,
  multipage: MultiPageViewerTool,
  viewtest: ViewTesterTool,
  urlparams: UrlParamBuilderTool,
  workflow: WorkflowDiagramTool,
  quickform: QuickFormBuilderTool,
  wordpdf: WordPdfConverterTool,
  maproute: MultiStopMapTool,
  payrequest: PaymentRequestTool,
  invoicepdf: SimpleInvoicePdfTool,
  quotepdf: SimpleQuotePdfTool,
  receiptpdf: SimpleReceiptPdfTool,
  pdfpages: PdfPageTool,
  checklist: QuickChecklistShareTool,
  textextract: TextExtractorTool,
};
