import { useState } from "react";
import type { PhotoShotType, PhotoStripRow, PhotoStripTheme } from "../../types/photo";
import PhotoStripPreview from "../../components/photo-strip/PhotoStripPreview";
import { toPng, toJpeg } from "html-to-image";
import { Printer } from "lucide-react";
import { templateRegistry } from "../photo-strip/templateRegistry";

type PhotoStripEditorPageProps = {
  photos: PhotoShotType[];
  onBack: () => void;
};

const themes = Object.entries(templateRegistry) as [
  PhotoStripTheme,
  (typeof templateRegistry)[PhotoStripTheme],
][];

export default function PhotoStripEditorPage({
  photos,
  onBack,
}: PhotoStripEditorPageProps) {
  const [rows, setRows] = useState<PhotoStripRow[]>([
    { id: 1, shot: null },
    { id: 2, shot: null },
    { id: 3, shot: null },
  ]);

  const [theme, setTheme] = useState<PhotoStripTheme>("classic");

    const exportImage = async (format: "png" | "jpg") => {
      const element = document.getElementById("printable-strip");

      if (!element) {
        console.error("Photo strip element not found");
        return;
      }

      try {
        // Tunggu semua gambar selesai dimuat
        const images = Array.from(element.querySelectorAll("img"));

        await Promise.all(
          images.map((img) => {
            if (img.complete && img.naturalWidth > 0) {
              return Promise.resolve();
            }

            return new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () =>
                reject(new Error(`Gagal memuat gambar: ${img.src}`));
            });
          }),
        );

        const options = {
          pixelRatio: 3,
          cacheBust: true,
          backgroundColor: templateRegistry[theme].backgroundColor,
        };

        const dataUrl =
          format === "png"
            ? await toPng(element, options)
            : await toJpeg(element, {
                ...options,
                quality: 0.95,
              });

        const link = document.createElement("a");
        link.download = `photo-strip.${format}`;
        link.href = dataUrl;
        link.click();
      } catch (error) {
        console.error("Photo strip export failed:", error);
      }
    };

  const updateRow = (rowId: number, shot: number | null) => {
    setRows((previous) =>
      previous.map((row) => (row.id === rowId ? { ...row, shot } : row)),
    );
  };

  const usedShots = rows
    .map((row) => row.shot)
    .filter((shot): shot is number => shot !== null);

  const allRowsFilled = rows.every((row) => row.shot !== null);

  return (
    <main className="min-h-screen bg-neutral-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Photo Strip Editor</h1>
            <p className="mt-2 text-sm text-white/60">
              Choose three photo pairs and arrange your strip.
            </p>
          </div>

          <button
            onClick={onBack}
            className="rounded-lg border border-white/20 px-4 py-2 hover:bg-white/10"
          >
            Back to photos
          </button>
        </header>

        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <section className="space-y-6">
            <div>
              <h2 className="mb-3 text-lg font-semibold">Choose photo pairs</h2>

              <div className="space-y-4">
                {rows.map((row) => (
                  <div
                    key={row.id}
                    className="rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <label
                      htmlFor={`row-${row.id}`}
                      className="mb-2 block text-sm font-medium"
                    >
                      Row {row.id}
                    </label>

                    <select
                      id={`row-${row.id}`}
                      value={row.shot ?? ""}
                      onChange={(event) =>
                        updateRow(
                          row.id,
                          event.target.value
                            ? Number(event.target.value)
                            : null,
                        )
                      }
                      className="w-full rounded-lg border border-white/20 bg-neutral-900 px-3 py-2 text-white"
                    >
                      <option value="">Choose a photo pair</option>

                      {photos.map((photo) => (
                        <option
                          key={photo.shot}
                          value={photo.shot}
                          disabled={
                            usedShots.includes(photo.shot) &&
                            row.shot !== photo.shot
                          }
                        >
                          Shot {photo.shot}
                        </option>
                      ))}
                    </select>

                    {row.shot !== null && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        {(() => {
                          const pair = photos.find(
                            (photo) => photo.shot === row.shot,
                          );

                          if (!pair) return null;

                          return (
                            <>
                              <div>
                                <img
                                  src={pair.myPhoto}
                                  alt="Your selected photo"
                                  className="aspect-4/3 w-full rounded-md object-cover"
                                />
                                <p className="mt-1 text-xs text-white/60">
                                  You
                                </p>
                              </div>

                              <div>
                                <img
                                  src={pair.partnerPhoto}
                                  alt="Partner's selected photo"
                                  className="aspect-4/3 w-full rounded-md object-cover"
                                />
                                <p className="mt-1 text-xs text-white/60">
                                  Partner
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Choose a theme</h2>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {themes.map(([themeId, themeInfo]) => (
              <button
                key={themeId}
                type="button"
                onClick={() => setTheme(themeId)}
                aria-pressed={theme === themeId}
                className={`rounded-xl border p-4 text-left transition ${
                  theme === themeId
                    ? "border-pink-500 bg-pink-500/20 text-white ring-2 ring-pink-500/40"
                    : "border-white/10 bg-white/5 text-white/70 hover:border-pink-400 hover:bg-white/10"
                }`}
              >
                <span className="font-medium">{themeInfo.name}</span>

                {theme === themeId && (
                  <span className="mt-1 block text-xs text-pink-300">
                    Selected
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

          <aside className="space-y-4">
            <h2 className="text-lg font-semibold">Preview</h2>

            <PhotoStripPreview photos={photos} rows={rows} theme={theme} />

            <div className="space-y-3">
              <button
                disabled={!allRowsFilled}
                onClick={() => window.print()}
                className="w-full rounded-xl bg-white px-5 py-3 font-semibold text-black hover:bg-white/80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="inline-flex items-center justify-center gap-2">
                  <Printer size={18} />
                  Save as PDF / Print
                </span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={!allRowsFilled}
                  onClick={() => exportImage("png")}
                  className="rounded-xl border border-white/20 px-4 py-3 font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Download PNG
                </button>

                <button
                  disabled={!allRowsFilled}
                  onClick={() => exportImage("jpg")}
                  className="rounded-xl border border-white/20 px-4 py-3 font-semibold hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Download JPG
                </button>
              </div>

            </div>
            {!allRowsFilled && (
              <p className="text-center text-xs text-white/50">
                Choose a photo pair for all three rows to print.
              </p>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
