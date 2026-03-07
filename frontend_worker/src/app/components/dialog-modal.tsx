import { Lang, T } from "./language-pack";

interface DialogModalProps {
  lang: Lang;
  isOpen: boolean;
  onClose: () => void;
}

export function DialogModal({ lang, isOpen, onClose }: DialogModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="bg-[#16213e] border-2 border-[#ff6b35] rounded-2xl p-8 max-w-[500px] w-[90%] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <p
          className="text-center text-[1.5rem] text-[#ff6b35] mb-6"
          style={{ fontFamily: "monospace", lineHeight: "1.6" }}
        >
          {T[lang].dbLearning}
        </p>
        <button
          onClick={onClose}
          className="w-full py-4 rounded-xl bg-[#ff6b35] text-white text-[1.3rem] cursor-pointer hover:bg-[#ff8855] active:scale-95 transition-all select-none"
        >
          {T[lang].close}
        </button>
      </div>
    </div>
  );
}
