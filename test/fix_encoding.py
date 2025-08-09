#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import glob

# Mapeo de caracteres mal codificados a su versión correcta
replacements = {
    'librerÃ­as': 'librerías',
    'MenÃº': 'Menú',
    'NavegaciÃ³n': 'Navegación',
    'SecciÃ³n': 'Sección',
    'bÃºsqueda': 'búsqueda',
    'BÃºsqueda': 'Búsqueda',
    'CÃ³digo': 'Código',
    'cÃ³digo': 'código',
    'CategorÃ­a': 'Categoría',
    'InformaciÃ³n': 'Información',
    'informaciÃ³n': 'información',
    'NÃºmero': 'Número',
    'EscÃ¡ner': 'Escáner',
    'escÃ¡ner': 'escáner',
    'automÃ¡ticamente': 'automáticamente',
    'dinÃ¡micamente': 'dinámicamente',
    'dinÃ¡micas': 'dinámicas',
    'aquÃ­': 'aquí',
    'aparecerÃ¡n': 'aparecerán',
    'PaginaciÃ³n': 'Paginación',
    'paginaciÃ³n': 'paginación',
    'pÃ¡gina': 'página',
    'PÃ¡gina': 'Página',
    'generarÃ¡n': 'generarán',
    'cargarÃ¡n': 'cargarán',
    'Auto-actualizaciÃ³n': 'Auto-actualización',
    'Ãšltima': 'Última',
    'sincronizaciÃ³n': 'sincronización',
    'rÃ¡pida': 'rápida',
    'MÃ¡s': 'Más',
    'MÃ¡ximo': 'Máximo',
    'Ã¡reas': 'áreas',
    'recibiÃ³': 'recibió',
    'detectarÃ¡': 'detectará',
    'GestiÃ³n': 'Gestión',
    'ContraseÃ±a': 'Contraseña',
    'AplicaciÃ³n': 'Aplicación',
    'aplicaciÃ³n': 'aplicación',
    'AutomÃ¡tico': 'Automático',
    'AutomÃ¡tica': 'Automática',
    'EspaÃ±ol': 'Español',
    'integraciÃ³n': 'integración',
    'cÃ¡lculo': 'cálculo',
    'sincronizarÃ¡n': 'sincronizarán',
    'ConexiÃ³n': 'Conexión',
    'conexiÃ³n': 'conexión',
    'SincronizaciÃ³n': 'Sincronización',
    'llenarÃ¡': 'llenará',
    'estÃ©': 'esté',
    'FunciÃ³n': 'Función',
    'implementarÃ­a': 'implementaría',
    'lÃ³gica': 'lógica',
    'producciÃ³n': 'producción',
    'vendrÃ­a': 'vendría',
    'ValidaciÃ³n': 'Validación',
    'dÃ­as': 'días',
    'estÃ¡': 'está',
    'ImplementaciÃ³n': 'Implementación',
    'actualizaciÃ³n': 'actualización',
    'despuÃ©s': 'después',
    'AnimaciÃ³n': 'Animación',
    'animaciÃ³n': 'animación',
    'AÃ±adir': 'Añadir',
    'pequeÃ±o': 'pequeño',
    'apariciÃ³n': 'aparición',
    'periÃ³dicas': 'periódicas',
    'Ã³ptimo': 'óptimo',
    'CaracterÃ­sticas': 'Características',
    'exportaciÃ³n': 'exportación',
    'estadÃ­sticas': 'estadísticas',
    'contraÃ­da': 'contraída',
    'ActualizaciÃ³n': 'Actualización',
    'ConfirmaciÃ³n': 'Confirmación',
    'confirmaciÃ³n': 'confirmación',
    'SesiÃ³n': 'Sesión',
    'sesiÃ³n': 'sesión',
    'parÃ¡metros': 'parámetros',
    'PodrÃ­as': 'Podrías',
    'mÃ¡s': 'más',
    'especÃ­ficos': 'específicos',
    'direcciÃ³n': 'dirección',
    'electrÃ³nico': 'electrónico',
    'confirmÃ³': 'confirmó',
    'tambiÃ©n': 'también',
    'aÃ±adir': 'añadir',
    'AÃ±adir': 'Añadir',
    'recuperaciÃ³n': 'recuperación',
    'contraseÃ±a': 'contraseña',
    'automÃ¡tica': 'automática',
    'ConfiguraciÃ³n': 'Configuración',
    'VersiÃ³n': 'Versión',
    'AplicaciÃ³n': 'Aplicación'
}

def fix_file_encoding(file_path):
    """Corrige la codificación de un archivo HTML"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Aplicar todas las correcciones
        for wrong, correct in replacements.items():
            content = content.replace(wrong, correct)
        
        # Escribir el archivo corregido
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print(f"✅ Corregido: {file_path}")
        return True
    except Exception as e:
        print(f"❌ Error en {file_path}: {str(e)}")
        return False

def main():
    """Función principal"""
    plantillas_dir = "plantillas"
    
    if not os.path.exists(plantillas_dir):
        print(f"❌ Directorio {plantillas_dir} no encontrado")
        return
    
    # Buscar todos los archivos HTML en el directorio plantillas
    html_files = glob.glob(os.path.join(plantillas_dir, "*.html"))
    
    if not html_files:
        print(f"❌ No se encontraron archivos HTML en {plantillas_dir}")
        return
    
    print(f"🔧 Corrigiendo codificación en {len(html_files)} archivos...")
    
    success_count = 0
    for file_path in html_files:
        if fix_file_encoding(file_path):
            success_count += 1
    
    print(f"\n✅ Proceso completado: {success_count}/{len(html_files)} archivos corregidos")

if __name__ == "__main__":
    main()
