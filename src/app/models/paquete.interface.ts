import { SafeUrl } from '@angular/platform-browser';
export interface PaqueteInterface {
    idPaquete?: string | null | undefined;
    codigoQrPaquete?: string | null | undefined;
    documentoUsuario?: string | null | undefined;
    documentoCliente?: string | null | undefined;
    idEstado?: string | null | undefined;
    qrCodeImage?: string | null | undefined;
    qrCodeUrl?: SafeUrl | null | undefined;
}