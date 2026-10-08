"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui";
import { INITIAL_ROOF_PHOTO_STATE, inspectRoofPhotoFile, reduceRoofPhotoState, roofImageAnalysisAvailability, ROOF_PHOTO_ACCEPT, ROOF_PHOTO_MAX_BYTES, validateRoofPhotoFile, type RoofPhotoAction, type RoofPhotoPreview } from "@/lib/roof-photo";

const analysisAvailability = roofImageAnalysisAvailability();

export function RoofPhotoInput({ value, onChange }: { value: RoofPhotoPreview | null; onChange: (value: RoofPhotoPreview | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(false);
  const [ui, setUi] = useState(INITIAL_ROOF_PHOTO_STATE);
  const active = useRef(false);
  function dispatch(action: RoofPhotoAction) { setUi(current => reduceRoofPhotoState(current, action)); }

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    // Clearing allows a user to select the same file again after a validation error.
    event.currentTarget.value = "";
    if (!file) {
      dispatch({ type: "cancel" });
      return;
    }
    const validationError = validateRoofPhotoFile(file);
    if (validationError) { dispatch({ type: "invalid", message: validationError }); return; }

    setProcessing(true);
    dispatch({ type: "loading" });
    let previewUrl: string | null = null;
    try {
      const dimensions = await inspectRoofPhotoFile(file);
      if (!active.current) return;
      previewUrl = URL.createObjectURL(file);
      const photo = { file, previewUrl, ...dimensions };
      onChange(photo);
      dispatch({ type: "selected", photo });
    } catch (cause) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (!active.current) return;
      dispatch({ type: "failed", message: cause instanceof Error ? cause.message : "The image could not be previewed. Try another file or continue without an image." });
    } finally {
      if (active.current) setProcessing(false);
    }
  }

  function remove() {
    onChange(null);
    dispatch({ type: "remove" });
  }

  return <section className="roof-photo-field" aria-labelledby="roof-photo-heading">
    <div className="roof-photo-heading"><div><h3 id="roof-photo-heading">Optional roof photo</h3><p>Preview a roof image on this device. Photo is not required.</p></div><span className="roof-photo-local-badge">Local preview only</span></div>
    <div className="roof-photo-disclosure" role="note"><strong>Analysis is unavailable.</strong> {analysisAvailability.message} A single photo also cannot establish structural integrity, exact solar yield, legal eligibility, or engineering safety. Your inputs are never overwritten from an image.</div>
    <div className="roof-photo-controls">
      <input ref={inputRef} className="sr-only" type="file" accept={ROOF_PHOTO_ACCEPT} aria-label="Choose an optional roof photo" aria-describedby="roof-photo-help roof-photo-error" onChange={handleFile} disabled={processing}/>
      <Button variant="secondary" type="button" onClick={() => inputRef.current?.click()} disabled={processing}><ImagePlus size={15} aria-hidden="true"/>{processing ? "Checking image…" : value ? "Choose a different image" : "Choose an image"}</Button>
      {value && <Button variant="quiet" type="button" onClick={remove} disabled={processing}><Trash2 size={15} aria-hidden="true"/>Remove photo</Button>}
      {processing && <span className="roof-photo-loading" role="status"><LoaderCircle size={15} aria-hidden="true" className="roof-photo-spinner"/>Checking file on this device</span>}
    </div>
    <p id="roof-photo-help" className="roof-photo-help">JPEG, PNG, or WebP · up to {ROOF_PHOTO_MAX_BYTES / 1024 / 1024} MB. Never uploaded, saved in history, included in reports, or sent to the assistant.</p>
    {ui.error && <p id="roof-photo-error" className="roof-photo-error" role="alert">{ui.error}</p>}
    {!ui.error && <p id="roof-photo-error" className="sr-only" aria-live="polite">{ui.status}</p>}
    {value && <figure className="roof-photo-preview"><Image src={value.previewUrl} alt="Optional roof photo preview for your own reference; not analyzed by SolarSmart" width={value.width} height={value.height} unoptimized/><figcaption>{value.file.name} · {value.width.toLocaleString()} × {value.height.toLocaleString()} px · temporary browser preview</figcaption></figure>}
  </section>;
}
