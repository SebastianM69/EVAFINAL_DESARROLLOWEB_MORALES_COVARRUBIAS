export type ProductRecord = {
  id: number;
  sku: string;
  nombre: string;
  descripcionCorta: string;
  descripcionLarga: string;
  imageUrl: string;
  precioNeto: string;
  precioVenta: string;
  stockActual: number;
  stockMinimo: number;
  stockBajo: number;
  stockAlto: number;
};
