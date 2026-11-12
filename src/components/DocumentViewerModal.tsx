import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  CheckCircle,
  AlertTriangle,
  Clock,
  Download,
  Printer,
  Maximize2,
  Minimize2,
  Eye,
  Award,
  BookOpen,
  User,
  GraduationCap,
  Loader2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { UploadedDoc } from '../types';
import { getCachedUploadedFile, loadUploadedFileFromDb } from '../services/firebase';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface DocumentCandidateContext {
  candidateName?: string;
  candidateEmail?: string;
  cin?: string;
  degree?: string;
  gpa?: number;
  mention?: string;
  thesisTitle?: string;
  supervisorName?: string;
}

interface DocumentViewerModalProps {
  doc: UploadedDoc | null;
  docTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onValidateDoc?: (note?: string) => void;
  onRejectDoc?: (reason: string) => void;
  canReview?: boolean;
  candidateContext?: DocumentCandidateContext;
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array | null {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return null;
    const header = dataUrl.slice(0, commaIdx);
    const body = dataUrl.slice(commaIdx + 1);

    if (header.includes(';base64')) {
      const byteCharacters = atob(body);
      const byteArray = new Uint8Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteArray[i] = byteCharacters.charCodeAt(i);
      }
      return byteArray;
    } else {
      const decoded = decodeURIComponent(body);
      return new TextEncoder().encode(decoded);
    }
  } catch {
    return null;
  }
}

// Convert base64 data URI to a Blob URL for downloads and <img> rendering
function dataUrlToBlobUrl(dataUrl: string, forceMime?: string): string {
  try {
    const commaIdx = dataUrl.indexOf(',');
    if (commaIdx === -1) return dataUrl;
    const header = dataUrl.slice(0, commaIdx);
    const mimeMatch = header.match(/data:([^;]+)/);
    const mimeType = forceMime || mimeMatch?.[1] || 'application/pdf';
    const byteArray = dataUrlToUint8Array(dataUrl);
    if (!byteArray) return dataUrl;
    const blob = new Blob([byteArray.buffer as ArrayBuffer], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch {
    return dataUrl;
  }
}

interface PdfCanvasViewerProps {
  dataUrl: string;
  zoom: number;
  fileName: string;
  fileSize: string;
  downloadUrl: string | null;
}

const PdfCanvasViewer: React.FC<PdfCanvasViewerProps> = ({
  dataUrl,
  zoom,
  fileName,
  fileSize,
  downloadUrl,
}) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rendering, setRendering] = useState<boolean>(true);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: pdfjsLib.PDFDocumentLoadingTask | null = null;

    const renderPdf = async () => {
      setRendering(true);
      setRenderError(null);

      const bytes = dataUrlToUint8Array(dataUrl);
      if (!bytes) {
        if (!cancelled) {
          setRenderError('Impossible de décoder le fichier PDF fourni.');
          setRendering(false);
        }
        return;
      }

      try {
        loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
        const pdf = await loadingTask.promise;
        if (cancelled) {
          await pdf.cleanup();
          return;
        }

        setPageCount(pdf.numPages);
        const container = containerRef.current;
        if (!container) return;
        container.innerHTML = '';

        const scale = (zoom / 100) * 1.25;
        const outputScale = Math.min(window.devicePixelRatio || 1, 2);

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          if (cancelled) break;
          const page = await pdf.getPage(pageNum);
          if (cancelled) break;

          const viewport = page.getViewport({ scale });

          const pageWrapper = document.createElement('div');
          pageWrapper.className =
            'bg-white shadow-md border border-slate-200 rounded-lg overflow-hidden mb-4 mx-auto';
          pageWrapper.style.width = `${Math.floor(viewport.width)}px`;
          pageWrapper.style.maxWidth = '100%';

          const pageHeader = document.createElement('div');
          pageHeader.className =
            'px-3 py-1 bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-500 flex justify-between';
          pageHeader.innerHTML = `<span>Page ${pageNum} / ${pdf.numPages}</span><span>${fileName}</span>`;
          pageWrapper.appendChild(pageHeader);

          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.width = Math.floor(viewport.width * outputScale);
          canvas.height = Math.floor(viewport.height * outputScale);
          canvas.style.width = `${Math.floor(viewport.width)}px`;
          canvas.style.height = 'auto';
          canvas.style.maxWidth = '100%';
          canvas.style.display = 'block';

          const transform =
            outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

          pageWrapper.appendChild(canvas);
          container.appendChild(pageWrapper);

          await page.render({
            canvasContext: context,
            transform,
            viewport,
            canvas,
          }).promise;
        }

        if (!cancelled) {
          setRendering(false);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('Erreur rendu PDF Canvas:', err);
          setRenderError(
            err?.message ||
              'Le fichier PDF ne peut pas être rendu directement. Utilisez le bouton Télécharger ci-dessus.'
          );
          setRendering(false);
        }
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      if (loadingTask) {
        loadingTask.destroy().catch(() => {});
      }
    };
  }, [dataUrl, zoom, fileName]);

  return (
    <div className="w-full bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-medium text-slate-700 truncate">
            Aperçu PDF : <strong>{fileName}</strong> ({fileSize})
          </span>
          {pageCount > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px] shrink-0">
              {pageCount} page{pageCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        {downloadUrl && (
          <a
            href={downloadUrl}
            download={fileName}
            className="text-slate-900 hover:underline font-semibold flex items-center gap-1 shrink-0"
          >
            <Download className="w-3 h-3" />
            Télécharger PDF
          </a>
        )}
      </div>

      <div className="p-4 bg-slate-100/80 max-h-[640px] overflow-auto">
        {rendering && !renderError && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
            <span>Rendu sécurisé du PDF en cours...</span>
          </div>
        )}

        {renderError ? (
          <div className="bg-white border border-rose-200 rounded-xl p-6 text-center space-y-3 text-xs">
            <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
            <div className="font-bold text-slate-900">Aperçu PDF indisponible pour ce fichier</div>
            <p className="text-slate-600">{renderError}</p>
            {downloadUrl && (
              <a
                href={downloadUrl}
                download={fileName}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Télécharger ({fileSize})</span>
              </a>
            )}
          </div>
        ) : (
          <div ref={containerRef} className="flex flex-col items-center" />
        )}
      </div>
    </div>
  );
};

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  doc,
  docTitle,
  isOpen,
  onClose,
  onValidateDoc,
  onRejectDoc,
  canReview = false,
  candidateContext,
}) => {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState<'visual' | 'metadata'>('visual');
  const [rejectPrompt, setRejectPrompt] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [resolvedDataUrl, setResolvedDataUrl] = useState<string | null>(null);
  const [blobPreviewUrl, setBlobPreviewUrl] = useState<string | null>(null);
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Hydrate fileData from memory or Firestore chunked uploadedFiles collection
  useEffect(() => {
    let active = true;

    if (!isOpen || !doc) {
      setResolvedDataUrl(null);
      setIsLoadingFile(false);
      return;
    }

    const inlineData =
      doc.fileData ||
      (doc.url && doc.url.startsWith('data:') ? doc.url : null) ||
      getCachedUploadedFile(doc.fileId);

    if (inlineData) {
      setResolvedDataUrl(inlineData);
      setIsLoadingFile(false);
      return;
    }

    if (doc.fileId) {
      setIsLoadingFile(true);
      loadUploadedFileFromDb(doc.fileId)
        .then((loaded) => {
          if (active) {
            setResolvedDataUrl(loaded);
            setIsLoadingFile(false);
          }
        })
        .catch(() => {
          if (active) setIsLoadingFile(false);
        });
    } else {
      setResolvedDataUrl(null);
      setIsLoadingFile(false);
    }

    return () => {
      active = false;
    };
  }, [isOpen, doc?.fileId, doc?.fileData, doc?.url, doc?.name]);

  // Convert DataURL to Blob URL for reliable in-iframe PDF & image rendering
  useEffect(() => {
    if (!resolvedDataUrl || !doc) {
      setBlobPreviewUrl(null);
      return;
    }

    const isPdf =
      doc.type?.includes('pdf') ||
      doc.name.toLowerCase().endsWith('.pdf') ||
      resolvedDataUrl.startsWith('data:application/pdf');
    const isImg =
      doc.type?.includes('image') ||
      /\.(png|jpe?g|webp|gif)$/i.test(doc.name) ||
      resolvedDataUrl.startsWith('data:image/');

    const forceMime = isPdf ? 'application/pdf' : isImg ? undefined : doc.type || undefined;
    const objectUrl = dataUrlToBlobUrl(resolvedDataUrl, forceMime);
    setBlobPreviewUrl(objectUrl);

    return () => {
      if (objectUrl && objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [resolvedDataUrl, doc?.name, doc?.type]);

  if (!isOpen || !doc) return null;

  const docStatus = doc.status || (doc.verified ? 'valid' : 'pending');
  const isUploadedFile = Boolean(resolvedDataUrl || doc.fileId);
  const isImage =
    doc.type?.includes('image') ||
    /\.(png|jpe?g|webp|gif)$/i.test(doc.name) ||
    Boolean(resolvedDataUrl && resolvedDataUrl.startsWith('data:image/'));
  const isPdfFile =
    doc.type?.includes('pdf') ||
    doc.name.toLowerCase().endsWith('.pdf') ||
    Boolean(resolvedDataUrl && resolvedDataUrl.startsWith('data:application/pdf'));

  // Candidate display values for realistic mock sheets
  const candName = candidateContext?.candidateName || 'Amina EL AMRANI';
  const candEmail = candidateContext?.candidateEmail || 'amina.elamrani@usmba.ac.ma';
  const candCin = candidateContext?.cin || (doc.name.match(/CD\d+/)?.[0] || 'CD678912');
  const candDegree = candidateContext?.degree || 'Master Big Data & Intelligence Artificielle';
  const candGpa = candidateContext?.gpa ?? 16.75;
  const candMention = candidateContext?.mention || 'Très Bien';
  const candSupervisor = candidateContext?.supervisorName || 'Pr. Mohammed ALAMI';
  const candThesis =
    candidateContext?.thesisTitle ||
    'Modèles Fondateurs Multimodaux pour le Diagnostic Précoce';
  const candInitials = candName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('');

  // Detect document type for realistic mock rendering
  const isCin = docTitle.toLowerCase().includes('identité') || docTitle.toLowerCase().includes('cin') || doc.name.toLowerCase().includes('cin');
  const isDiploma = docTitle.toLowerCase().includes('diplôme') || docTitle.toLowerCase().includes('master') || doc.name.toLowerCase().includes('diplome') || doc.name.toLowerCase().includes('attestation');
  const isTranscripts = docTitle.toLowerCase().includes('relevé') || doc.name.toLowerCase().includes('releve') || doc.name.toLowerCase().includes('notes');
  const isCv = docTitle.toLowerCase().includes('cv') || docTitle.toLowerCase().includes('curriculum') || doc.name.toLowerCase().includes('cv');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className={`bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-800 transition-all ${
          isFullscreen ? 'w-full h-full max-w-none max-h-none rounded-none' : 'w-full max-w-4xl max-h-[92vh]'
        }`}
      >
        {/* Header Bar */}
        <div className="p-3 sm:px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                {docTitle}
              </div>
              <div className="text-[10px] text-slate-500 font-mono truncate">
                {doc.name} • {doc.size}
              </div>
            </div>
          </div>

          {/* Viewer Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* View Mode Switcher */}
            <div className="hidden sm:flex items-center bg-slate-200/70 p-0.5 rounded-lg text-[11px] font-medium mr-1">
              <button
                onClick={() => setActiveViewTab('visual')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  activeViewTab === 'visual' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Aperçu Visuel
              </button>
              <button
                onClick={() => setActiveViewTab('metadata')}
                className={`px-2 py-1 rounded-md transition cursor-pointer ${
                  activeViewTab === 'metadata' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600'
                }`}
              >
                Fiche Métadonnées
              </button>
            </div>

            {/* Zoom */}
            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-2xs">
              <button
                onClick={() => setZoom((z) => Math.max(60, z - 15))}
                className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer rounded-l-lg"
                title="Zoom arrière"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[11px] font-mono text-slate-600 px-1 w-9 text-center">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(160, z + 15))}
                className="p-1.5 hover:bg-slate-100 text-slate-600 cursor-pointer rounded-r-lg"
                title="Zoom avant"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {blobPreviewUrl && (
              <a
                href={blobPreviewUrl}
                download={doc.name}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 cursor-pointer flex items-center gap-1 text-[11px] font-medium"
                title="Télécharger le fichier original"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Télécharger</span>
              </a>
            )}

            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer hidden sm:flex"
              title="Imprimer le document"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
              title={isFullscreen ? 'Fenêtre standard' : 'Plein écran'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verification Status Sub-header */}
        <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-[11px]">Statut de conformité :</span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                docStatus === 'valid'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : docStatus === 'rejected'
                  ? 'bg-rose-50 text-rose-800 border border-rose-300'
                  : 'bg-amber-50 text-amber-900 border border-amber-300'
              }`}
            >
              {docStatus === 'valid' ? (
                <>
                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                  Pièce validée conforme
                </>
              ) : docStatus === 'rejected' ? (
                <>
                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                  Pièce signalée non conforme
                </>
              ) : (
                <>
                  <Clock className="w-3 h-3 text-amber-600" />
                  En attente d'examen par le responsable
                </>
              )}
            </span>
          </div>

          {doc.feedback && (
            <div className="text-[11px] text-rose-800 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 flex items-center gap-1.5">
              <span className="font-bold">Observation :</span>
              <span>{doc.feedback}</span>
            </div>
          )}
        </div>

        {/* Viewer Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto bg-slate-200/50 flex-1 flex flex-col items-center justify-start min-h-[420px]">
          {activeViewTab === 'metadata' ? (
            /* Metadata Sheet */
            <div className="w-full max-w-lg bg-white rounded-xl shadow-md p-6 border border-slate-200 space-y-4 text-xs">
              <div className="border-b border-slate-100 pb-3">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  Métadonnées Numériques USMBA
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-1">{docTitle}</h3>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Nom du fichier :</span>
                  <span className="font-mono text-slate-900 font-bold truncate max-w-[220px]">{doc.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Poids / Taille :</span>
                  <span className="text-slate-900">{doc.size}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Type MIME :</span>
                  <span className="font-mono text-slate-700">{doc.type || 'application/pdf'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Date d'enregistrement :</span>
                  <span className="text-slate-900">{doc.uploadDate}</span>
                </div>
                {doc.verifiedBy && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Examiné par :</span>
                    <span className="text-slate-900 font-semibold">{doc.verifiedBy} ({doc.verifiedAt})</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-lg text-[11px] leading-relaxed">
                Ce document fait partie des 5 pièces justificatives obligatoires de recevabilité du dossier de doctorat. Il a été archivé et horodaté dans la base de données décentralisée de l'USMBA.
              </div>
            </div>
          ) : isLoadingFile ? (
            <div className="w-full max-w-2xl bg-white rounded-xl shadow-md border border-slate-200 p-12 flex flex-col items-center justify-center gap-3 text-slate-600 text-xs">
              <Loader2 className="w-7 h-7 animate-spin text-slate-800" />
              <span>Chargement du document PDF depuis la base de données...</span>
            </div>
          ) : isUploadedFile && resolvedDataUrl && blobPreviewUrl ? (
            /* REAL UPLOADED FILE VIEWER (PDF Canvas, IMAGE, or FILE) */
            <div
              className="w-full max-w-4xl mx-auto flex flex-col items-center gap-2 transition-all"
            >
              {isImage ? (
                <div
                  style={{ width: `${Math.min(100, Math.max(50, zoom))}%` }}
                  className="bg-white p-3 rounded-xl shadow-lg border border-slate-200 mx-auto"
                >
                  <img
                    src={blobPreviewUrl}
                    alt={doc.name}
                    className="max-h-[620px] w-auto mx-auto rounded object-contain"
                  />
                  <div className="text-center text-[10px] text-slate-500 mt-2 font-mono">
                    Image téléversée : {doc.name} ({doc.size})
                  </div>
                </div>
              ) : isPdfFile ? (
                <PdfCanvasViewer
                  dataUrl={resolvedDataUrl}
                  zoom={zoom}
                  fileName={doc.name}
                  fileSize={doc.size}
                  downloadUrl={blobPreviewUrl}
                />
              ) : (
                <div className="w-full max-w-lg bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center space-y-3 text-xs">
                  <FileText className="w-10 h-10 text-slate-700 mx-auto" />
                  <div className="font-bold text-slate-900 text-sm">{doc.name}</div>
                  <p className="text-slate-500">
                    Ce format ({doc.type || 'fichier'}) ne dispose pas d'un rendu direct dans le navigateur. Téléchargez-le pour l'ouvrir localement.
                  </p>
                  <a
                    href={blobPreviewUrl}
                    download={doc.name}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger ({doc.size})</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            /* AUTHENTIC OFFICIAL MOCK PDF RENDERING FOR THE 5 DOCUMENTS */
            <div
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-300 p-8 space-y-6 text-slate-800 transition-transform font-sans"
            >
              {/* Document Official Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-900 tracking-wider">
                    ROYAUME DU MAROC
                  </div>
                  <div className="text-[10px] text-slate-600 font-arabic text-right">
                    المملكة المغربية
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800 mt-1">
                    UNIVERSITÉ SIDI MOHAMED BEN ABDELLAH DE FÈS
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Centre d'Études Doctorales (CED)
                  </div>
                </div>

                <div className="text-right">
                  <div className="inline-block p-1.5 border border-slate-300 rounded bg-slate-50 text-[10px] font-mono text-slate-700">
                    N° DOC: {doc.name.replace('.pdf', '')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1">
                    Date : {doc.uploadDate}
                  </div>
                </div>
              </div>

              {/* SPECIFIC VISUAL SHEET ACCORDING TO DOCUMENT TYPE */}
              {isCin ? (
                /* 1. CARTE NATIONALE D'IDENTITÉ (CIN) VISUAL */
                <div className="space-y-4">
                  <div className="text-center font-bold text-xs uppercase tracking-widest text-slate-700">
                    Carte Nationale d'Identité Électronique (CNIE)
                  </div>

                  <div className="bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-6 rounded-2xl border-2 border-emerald-600/30 shadow-md space-y-4 relative overflow-hidden">
                    {/* Moroccan Star Watermark Background */}
                    <div className="absolute right-4 top-4 text-emerald-600/10 text-9xl font-bold select-none pointer-events-none">
                      ★
                    </div>

                    <div className="flex items-center justify-between border-b border-emerald-900/10 pb-2">
                      <span className="font-bold text-xs text-emerald-900">ROYAUME DU MAROC • CNIE</span>
                      <span className="font-mono text-xs font-bold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
                        {candCin}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      <div className="w-24 h-32 bg-slate-200 rounded-lg border-2 border-emerald-200 flex flex-col items-center justify-center text-slate-500 overflow-hidden shadow-xs">
                        <User className="w-12 h-12 text-slate-400" />
                        <span className="text-[9px] uppercase font-bold text-slate-600 mt-1">Photo Officielle</span>
                      </div>

                      <div className="col-span-2 space-y-1.5 text-xs text-slate-800">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Nom & Prénom / الإسم الكامل</span>
                          <strong className="text-sm font-bold text-slate-900 uppercase">{candName}</strong>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 block">Née le / تاريخ الازدياد</span>
                            <span className="font-medium">18/04/2001 à Fès</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 block">Validité / الصلاحية</span>
                            <span className="font-medium">Jusqu'au 2032</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Adresse / العنوان</span>
                          <span className="text-[11px] text-slate-600">Avenue des FAR, Ville Nouvelle, Fès</span>
                        </div>
                      </div>
                    </div>

                    {/* Machine Readable Zone (MRZ) */}
                    <div className="pt-2 border-t border-emerald-900/10 font-mono text-[9px] tracking-widest text-slate-500 bg-slate-50 p-2 rounded">
                      {`IDMAR${candCin}M<<<<<<<<<<<<<<<<<`}<br />
                      {`0104184F3210156MAR<<<<<<<<<<<8${candName.toUpperCase().replace(/\s+/g, '<<')}`}
                    </div>
                  </div>
                </div>
              ) : isDiploma ? (
                /* 2. DIPLÔME MASTER OU INGÉNIEUR VISUAL */
                <div className="space-y-4">
                  <div className="text-center space-y-1">
                    <Award className="w-10 h-10 text-amber-600 mx-auto" />
                    <div className="text-base font-serif font-bold text-slate-900 uppercase tracking-widest">
                      DIPLÔME DE MASTER DE RECHERCHE
                    </div>
                    <div className="text-[11px] text-slate-500 italic">
                      Sciences et Techniques de l'Ingénieur
                    </div>
                  </div>

                  <div className="p-6 bg-amber-50/30 rounded-xl border-2 border-amber-300/60 text-center space-y-3 font-serif">
                    <p className="text-xs text-slate-700 leading-relaxed">
                      Vu la loi n° 01-00 portant organisation de l'enseignement supérieur,<br />
                      Vu les procès-verbaux des délibérations du jury réuni à la Faculté des Sciences et Techniques de Fès,
                    </p>

                    <div className="py-2">
                      <span className="text-xs text-slate-500 uppercase tracking-wider block">Le Diplôme de Master est décerné à :</span>
                      <span className="text-lg font-bold text-slate-900 block my-1">{candName}</span>
                      <span className="text-xs text-slate-700 font-sans block">
                        Spécialité : <strong>{candDegree}</strong>
                      </span>
                      <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-900 font-sans font-bold text-xs rounded-full border border-amber-300">
                        Mention : {candMention.toUpperCase()} (Moyenne : {candGpa} / 20)
                      </span>
                    </div>

                    <div className="pt-4 flex justify-between items-end text-center text-xs font-sans text-slate-600">
                      <div>
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-red-400 flex items-center justify-center text-red-600 text-[10px] font-bold mx-auto rotate-12">
                          CACHET<br />OFFICIEL<br />USMBA
                        </div>
                        <span className="block mt-1 font-semibold">Le Doyen de la Faculté</span>
                      </div>

                      <div>
                        <div className="text-sm font-signature text-slate-800 italic font-bold">
                          Pr. R. Mrabet
                        </div>
                        <span className="block mt-1 font-semibold">Le Président de l'Université</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : isTranscripts ? (
                /* 3. RELEVÉS DE NOTES (S1-S4) VISUAL */
                <div className="space-y-4">
                  <div className="text-center font-bold text-xs uppercase tracking-wider text-slate-900">
                    Relevé Officiel des Notes et Résultats Globaux (Master S1 - S4)
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-semibold text-[11px] border-b border-slate-200">
                          <th className="py-2 px-3">Semestre / Module</th>
                          <th className="py-2 px-3 text-center">Note /20</th>
                          <th className="py-2 px-3 text-center">Crédits</th>
                          <th className="py-2 px-3 text-right">Résultat</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                        <tr className="bg-slate-50/50 font-semibold font-sans">
                          <td colSpan={4} className="py-1.5 px-3 text-slate-900">Semestre 1 (S1) : Algorithmique & Fondations</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-3 pl-6 font-sans">M11 : Algorithmes Distribués & Complexité</td>
                          <td className="py-1 px-3 text-center font-bold">17.00</td>
                          <td className="py-1 px-3 text-center">6 ECTS</td>
                          <td className="py-1 px-3 text-right text-emerald-700 font-bold">Validé</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-3 pl-6 font-sans">M12 : Optimisation Mathématique & Recherche Opérationnelle</td>
                          <td className="py-1 px-3 text-center font-bold">16.50</td>
                          <td className="py-1 px-3 text-center">6 ECTS</td>
                          <td className="py-1 px-3 text-right text-emerald-700 font-bold">Validé</td>
                        </tr>
                        <tr className="bg-slate-50/50 font-semibold font-sans">
                          <td colSpan={4} className="py-1.5 px-3 text-slate-900">Semestre 2 (S2) : Machine Learning & Systèmes Big Data</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-3 pl-6 font-sans">M21 : Deep Learning & Réseaux de Neurones</td>
                          <td className="py-1 px-3 text-center font-bold">17.50</td>
                          <td className="py-1 px-3 text-center">6 ECTS</td>
                          <td className="py-1 px-3 text-right text-emerald-700 font-bold">Validé</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-3 pl-6 font-sans">M22 : Architectures Cloud & Traitement Massif (Hadoop/Spark)</td>
                          <td className="py-1 px-3 text-center font-bold">16.00</td>
                          <td className="py-1 px-3 text-center">6 ECTS</td>
                          <td className="py-1 px-3 text-right text-emerald-700 font-bold">Validé</td>
                        </tr>
                        <tr className="bg-slate-50/50 font-semibold font-sans">
                          <td colSpan={4} className="py-1.5 px-3 text-slate-900">Semestre 3 (S3) : Vision & Modèles Avancés</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-3 pl-6 font-sans">M31 : Vision par Ordinateur & Imagerie Médicale</td>
                          <td className="py-1 px-3 text-center font-bold">18.00</td>
                          <td className="py-1 px-3 text-center">6 ECTS</td>
                          <td className="py-1 px-3 text-right text-emerald-700 font-bold">Validé</td>
                        </tr>
                        <tr className="bg-slate-50/50 font-semibold font-sans">
                          <td colSpan={4} className="py-1.5 px-3 text-slate-900">Semestre 4 (S4) : Projet de Fin d'Études (Mémoire Recherche)</td>
                        </tr>
                        <tr>
                          <td className="py-1 px-3 pl-6 font-sans">M41 : Soutenance PFE devant Jury & Publication</td>
                          <td className="py-1 px-3 text-center font-bold">18.00</td>
                          <td className="py-1 px-3 text-center">30 ECTS</td>
                          <td className="py-1 px-3 text-right text-emerald-700 font-bold">Validé</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">MOYENNE GÉNÉRALE DU MASTER :</span>
                      <span className="text-base font-bold text-emerald-700">{candGpa} / 20 (Mention {candMention})</span>
                    </div>
                  </div>
                </div>
              ) : isCv ? (
                /* 4. CURRICULUM VITAE (CV) VISUAL */
                <div className="space-y-4 text-xs">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">{candName}</h3>
                      <div className="text-slate-600 font-medium">Diplômé(e) : {candDegree}</div>
                      <div className="text-slate-500 text-[11px] mt-0.5">Fès, Maroc • {candEmail} • CIN: {candCin}</div>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-lg">
                      {candInitials || 'US'}
                    </div>
                  </div>

                  <div className="space-y-3 text-slate-700">
                    <div>
                      <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-100 pb-1 mb-1">
                        Formation Universitaire
                      </h4>
                      <p className="text-[11px]"><strong>2024 - 2026 :</strong> Master Big Data & Intelligence Artificielle (FST Fès) - Major de promotion (16.75/20)</p>
                      <p className="text-[11px]"><strong>2021 - 2024 :</strong> Licence Sciences et Techniques en Génie Informatique (FST Fès) - Mention Bien</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-100 pb-1 mb-1">
                        Projets de Recherche & Publications
                      </h4>
                      <p className="text-[11px] leading-relaxed">
                        • <em>"Multimodal Deep Attention for Cardiac Pathology Detection"</em>, présenté aux Doctoral Days USMBA 2026.<br />
                        • Conception d'une pipeline PyTorch de segmentation d'imagerie échocardiographique avec Transformers au Laboratoire LIIAN.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-900 uppercase text-[10px] tracking-wider border-b border-slate-100 pb-1 mb-1">
                        Compétences Techniques
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {['Python', 'PyTorch', 'TensorFlow', 'Computer Vision', 'Transformers', 'Docker', 'Git', 'LaTeX', 'SQL'].map((t) => (
                          <span key={t} className="bg-slate-100 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* 5. LETTRE DE MOTIVATION VISUAL */
                <div className="space-y-4 text-xs font-serif leading-relaxed text-slate-800">
                  <div className="text-right text-[11px] text-slate-500 font-sans">
                    Fès, le {doc.uploadDate}
                  </div>

                  <div className="space-y-0.5 font-sans text-xs">
                    <div><strong>{candName}</strong></div>
                    <div>Avenue des FAR, Fès</div>
                    <div>Email : {candEmail}</div>
                  </div>

                  <div className="pt-2 font-sans text-xs">
                    <strong className="block text-slate-900">À l'attention de Monsieur le Directeur du CED Sciences et Techniques</strong>
                    <span className="text-slate-600">et de {candSupervisor}, Responsable de Thèse</span>
                  </div>

                  <div className="font-sans font-bold text-slate-900 pt-1">
                    Objet : Candidature au concours d'accès au Doctorat - Année Universitaire 2026/2027
                  </div>

                  <div className="space-y-3 pt-2 text-[12px] text-justify">
                    <p>Monsieur le Directeur, Monsieur le Professeur,</p>
                    <p>
                      Titulaire d'un diplôme ({candDegree}) à l'Université Sidi Mohamed Ben Abdellah de Fès avec une moyenne générale de {candGpa}/20 (mention {candMention}), j'ai l'honneur de vous soumettre ma candidature pour préparer une thèse de doctorat sous votre direction.
                    </p>
                    <p>
                      Mon parcours de formation et mon stage de recherche m'ont permis d'acquérir une solide maîtrise méthodologique et scientifique. Le sujet doctoral intitulé <em>{candThesis}</em> répond parfaitement à mes aspirations de recherche et aux priorités scientifiques de votre laboratoire.
                    </p>
                    <p>
                      Motivé(e), rigoureux(se) et passionné(e) par la recherche scientifique, je sollicite l'opportunité de mettre mon engagement et mes compétences au service de votre équipe.
                    </p>
                    <p className="text-right pt-4 font-sans font-bold">
                      {candName}<br />
                      <span className="text-[10px] text-slate-400 font-normal">Signature numérique vérifiée</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Bottom Digital Footprint Stamp */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>USMBA Digital Vault • Empreinte SHA256 Vérifiée</span>
                <span>Portail GCD • Réf : {doc.name}</span>
              </div>
            </div>
          )}

          {/* Quick Reviewer Controls inside Viewer if viewed by professor */}
          {canReview && (
            <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl p-3.5 shadow-md space-y-2.5 mt-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Validation / Rejet de cette pièce par l'enseignant responsable
              </span>

              {!rejectPrompt ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onValidateDoc && onValidateDoc()}
                    className="flex-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Valider cette pièce comme conforme</span>
                  </button>

                  <button
                    onClick={() => setRejectPrompt(true)}
                    className="flex-1 px-4 py-2 rounded-lg border border-rose-300 hover:bg-rose-50 text-rose-700 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Signaler un problème / Rejeter la pièce</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2 pt-1 animate-in fade-in">
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Préciser le motif de rejet (ex: relevé S4 manquant, diplôme non légalisé)..."
                    className="w-full px-3 py-1.5 rounded-lg border border-rose-300 text-xs text-slate-900 outline-none"
                    autoFocus
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setRejectPrompt(false)}
                      className="px-3 py-1 rounded text-xs text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={() => {
                        if (onRejectDoc && rejectReason.trim()) {
                          onRejectDoc(rejectReason.trim());
                          setRejectPrompt(false);
                          setRejectReason('');
                        }
                      }}
                      disabled={!rejectReason.trim()}
                      className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                    >
                      Confirmer le rejet & notifier
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Visualiseur de documents officiels • Université Sidi Mohamed Ben Abdellah
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs transition cursor-pointer"
          >
            Fermer l'Aperçu
          </button>
        </div>
      </div>
    </div>
  );
};
