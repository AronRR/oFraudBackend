/* eslint-disable prettier/prettier */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { RejectionReasonRepository } from './rejection-reason.repository';

const DEFAULT_REJECTION_REASONS = Object.freeze([
  { code: 'spam', label: 'Contenido spam', description: 'Publicaciones automatizadas o de baja calidad.' },
  { code: 'scam', label: 'Posible estafa', description: 'Intento de fraude o engaño a otros usuarios.' },
  { code: 'abuse', label: 'Contenido abusivo', description: 'Lenguaje ofensivo, amenazas o acoso.' },
  { code: 'unsupported', label: 'Evidencia insuficiente', description: 'El reporte no incluye la evidencia necesaria.' },
]);

@Injectable()
export class RejectionReasonSeeder implements OnModuleInit {
  constructor(private readonly rejectionReasonRepository: RejectionReasonRepository) {}

  async onModuleInit(): Promise<void> {
    await this.rejectionReasonRepository.ensureSeeded(DEFAULT_REJECTION_REASONS);
  }
}
