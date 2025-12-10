import { format } from "date-fns";

export function formatDate(date: string) {
  return format(new Date(date), "dd/MM/yyyy HH:mm");
}

export function formatDateShort(date: string) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(date: string) {
  return format(new Date(date), "dd/MM/yyyy");
}
