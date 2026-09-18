import type { Metadata } from "next";
import { firstParam, type PageSearchParams } from "@/features/documents";
import { SellPage, parseSellParams } from "@/features/sell";

// E11 — Composeur Vendre (06 E11, 07 J9).
export const metadata: Metadata = { title: "Vendre" };

export default async function Page({ searchParams }: { searchParams: PageSearchParams }) {
  const params = await searchParams;
  return (
    <SellPage
      params={parseSellParams({
        mode: firstParam(params.mode),
        client: firstParam(params.client),
        parfum: firstParam(params.parfum),
        depuis: firstParam(params.depuis),
      })}
      docId={firstParam(params.doc)}
    />
  );
}
