// Şema kaydı: yeni aygıt = src/aygitlar/<id>/Sema.tsx + buraya bir satır + icerik/<id>/aygit.json (docs/YENI-AYGIT.md)
import type React from "react";
import type { Kutu } from "../motor/katman";
import { KombiSema, PARCALAR as KOMBI } from "./kombi/Sema";

export type SemaTanim = { Cizim: React.FC; parcalar: Record<string, Kutu> };

export const SEMALAR: Record<string, SemaTanim> = {
  kombi: { Cizim: KombiSema, parcalar: KOMBI },
};
