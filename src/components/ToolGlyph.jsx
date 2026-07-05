import {
  AlarmClock, AlignLeft, ArrowLeftRight, ArrowRight, Bot, Braces, BriefcaseBusiness,
  Bike, Calculator, CalendarPlus, CalendarRange, Camera, Car, Check, CheckSquare, ChevronDown, ChevronUp,
  ClipboardList, Clock3, Code2,
  Crosshair, Diamond, DollarSign, Download, Earth, FileImage, FileSearch, FileText, Files,
  Fingerprint, FolderOpen, Gauge, GitCompare, Globe, GraduationCap, Hash,
  Image, ImageDown, Images, LayoutGrid, Lightbulb, Link2, ListChecks, Mail, MapPin, Mic, Monitor,
  Palette, PenLine, Percent, Phone, Plus, QrCode, Redo2, RefreshCw, Scissors, Search,
  Settings, ShieldAlert, Siren, Smile, Sparkles, Square, Star, TestTube2, Train,
  Text, Timer, Trash2, TriangleAlert, Type, Undo2, UserRound, Video, Volume2, Watch, Workflow, Wrench, X, Zap,
} from 'lucide-react';

const glyphs = {
  smile: Smile, calendarRange: CalendarRange, calendarPlus: CalendarPlus,
  percent: Percent, alignLeft: AlignLeft, arrowRight: ArrowRight,
  sparkles: Sparkles, type: Type, text: Text, imageDown: ImageDown,
  code: Code2, braces: Braces, images: Images, fileImage: FileImage,
  files: Files, globe: Globe, gauge: Gauge, clock: Clock3,
  dollar: DollarSign, signature: PenLine, volume: Volume2, mic: Mic,
  mapPin: MapPin, monitor: Monitor, camera: Camera,
  swap: ArrowLeftRight, shieldAlert: ShieldAlert, search: Search,
  calculator: Calculator, earth: Earth, qr: QrCode, scissors: Scissors,
  refresh: RefreshCw, fileSearch: FileSearch, lightbulb: Lightbulb,
  graduation: GraduationCap, business: BriefcaseBusiness, wrench: Wrench,
  fileText: FileText, bot: Bot, star: Star, zap: Zap, check: Check,
  settings: Settings, folder: FolderOpen, image: Image,
  crosshair: Crosshair, warning: TriangleAlert, siren: Siren,
  palette: Palette, timer: Timer, gitCompare: GitCompare,
  testTube: TestTube2, link: Link2, fingerprint: Fingerprint,
  alarmClock: AlarmClock, watch: Watch,
  layoutGrid: LayoutGrid, userRound: UserRound, video: Video, workflow: Workflow,
  car: Car, bike: Bike, train: Train,
  square: Square, diamond: Diamond, trash: Trash2, undo: Undo2, redo: Redo2,
  clipboardList: ClipboardList, mail: Mail, phone: Phone, hash: Hash,
  listChecks: ListChecks, checkSquare: CheckSquare, chevronUp: ChevronUp,
  chevronDown: ChevronDown, plus: Plus, close: X, download: Download,
};

export default function ToolGlyph({ name, size = 24, strokeWidth = 2, filled = false, className }) {
  const Glyph = glyphs[name] || Wrench;
  return <Glyph width={size} height={size} strokeWidth={strokeWidth} fill={filled ? 'currentColor' : 'none'} className={className} aria-hidden="true"/>;
}
