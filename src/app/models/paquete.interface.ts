import { SafeUrl } from '@angular/platform-browser';
export interface PaqueteInterface {
    idPaquete?: any | null | undefined;
    codigoPaquete?: any | null | undefined;
    direccionPaquete?: string | null | undefined;
    detalleDireccionPaquete?: any | null | undefined;
    qrCodeImage?: string | null | undefined;
    qrCodeUrl?: SafeUrl | null | undefined;
    pesoPaquete?: string | null | undefined;
    unidadesPaquete?: string | null | undefined;
    contenidoPaquete?: any | null | undefined;
    documentoDestinatario?: string | null | undefined;
    nombreDestinatario?: string | null | undefined;
    correoDestinatario?: string | null | undefined;
    telefonoDestinatario?: string | null | undefined;
    fechaAproxEntrega?: any | null | undefined;
    documentoRemitente?: string | null | undefined;
    documentoUsuario?: string | null | undefined;
    idEstado?: string | null | undefined;
    idTamano?: string | null | undefined;
    idTipo?: string | null | undefined;
    lat?: any | null | undefined;
    lng?: any | null | undefined;
}