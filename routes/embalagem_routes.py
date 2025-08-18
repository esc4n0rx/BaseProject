"""
Rotas específicas do módulo de embalagem
"""
from flask import Blueprint, jsonify, request, render_template
import logging
from datetime import datetime

from services.embalagem_service import embalagem_service
from utils.upload_handler import upload_handler

embalagem_bp = Blueprint('embalagem', __name__)

@embalagem_bp.route('/api/embalagem/stats')
def get_stats():
    """API para obter estatísticas do dashboard"""
    try:
        stats = embalagem_service.get_dashboard_stats()
        if stats:
            return jsonify({
                'success': True,
                'data': {
                    'total_remessas': stats.total_remessas,
                    'pendentes': stats.pendentes,
                    'em_separacao': stats.em_separacao,
                    'finalizados': stats.finalizados,
                    'faturados': stats.faturados,
                    'percentual_corte': stats.percentual_corte,
                    'total_itens': stats.total_itens,
                    'itens_com_corte': stats.itens_com_corte
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Erro ao obter estatísticas'}), 500
    except Exception as e:
        logging.error(f"Erro na API de estatísticas: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@embalagem_bp.route('/api/embalagem/upload', methods=['POST'])
def upload_planilha():
    """API para upload de planilha"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'Nenhum arquivo enviado'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'success': False, 'error': 'Nenhum arquivo selecionado'}), 400
        
        # Validar formato do arquivo
        if not upload_handler.validate_file_format(file):
            return jsonify({
                'success': False, 
                'error': 'Formato de arquivo inválido. Use apenas .xlsx ou .xls'
            }), 400
        
        # Processar arquivo
        records = upload_handler.parse_excel_file(file)
        
        if records is None:
            return jsonify({
                'success': False, 
                'error': 'Erro ao processar arquivo. Verifique o formato e colunas obrigatórias.'
            }), 400
        
        if not records:
            return jsonify({
                'success': False, 
                'error': 'Nenhum registro válido encontrado no arquivo'
            }), 400
        
        # Processar upload
        result = embalagem_service.process_upload(records)
        
        if result['success']:
            return jsonify({
                'success': True,
                'message': f"Upload realizado com sucesso! {result['valid_records']} registros inseridos.",
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Erro no processamento'),
                'data': result
            }), 500
            
    except Exception as e:
        logging.error(f"Erro no upload: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@embalagem_bp.route('/api/embalagem/data')
def get_data():
    """API para obter dados paginados com filtros"""
    try:
        # Parâmetros de paginação
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 50))
        
        # Parâmetros de filtro
        filters = {
            'data_inicio': request.args.get('data_inicio'),
            'data_fim': request.args.get('data_fim'),
            'status': request.args.get('status'),
            'remessa': request.args.get('remessa'),
            'loja': request.args.get('loja'),
            'codigo': request.args.get('codigo')
        }
        
        # Remover filtros vazios
        filters = {k: v for k, v in filters.items() if v}
        
        result = embalagem_service.get_paginated_data(page, per_page, filters)
        
        if result:
            return jsonify({
                'success': True,
                'data': result['data'],
                'pagination': {
                    'current_page': result['current_page'],
                    'total_pages': result['total_pages'],
                    'total_records': result['total_records'],
                    'per_page': result['per_page'],
                    'has_next': result['has_next'],
                    'has_prev': result['has_prev']
                }
            })
        else:
            return jsonify({'success': False, 'error': 'Erro ao obter dados'}), 500
            
    except Exception as e:
        logging.error(f"Erro na API de dados: {e}")
        return jsonify({'success': False, 'error': str(e)}
                      ), 500
    
@embalagem_bp.route('/api/embalagem/record/<int:record_id>')
def get_record_details(record_id):
    """API para obter detalhes de um registro específico"""
    try:
        record = embalagem_service.get_record_by_id(record_id)
        
        if record:
            return jsonify({
                'success': True,
                'data': record
            })
        else:
            return jsonify({'success': False, 'error': 'Registro não encontrado'}), 404
            
    except Exception as e:
        logging.error(f"Erro ao obter detalhes do registro: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@embalagem_bp.route('/api/embalagem/export')
def export_data():
    """API para exportar dados filtrados"""
    try:
        # Parâmetros de filtro
        filters = {
            'data_inicio': request.args.get('data_inicio'),
            'data_fim': request.args.get('data_fim'),
            'status': request.args.get('status'),
            'remessa': request.args.get('remessa'),
            'loja': request.args.get('loja'),
            'codigo': request.args.get('codigo')
        }
        
        # Remover filtros vazios
        filters = {k: v for k, v in filters.items() if v}
        
        # Formato de exportação
        export_format = request.args.get('format', 'excel')
        
        result = embalagem_service.export_data(filters, export_format)
        
        if result:
            return jsonify({
                'success': True,
                'download_url': result['download_url'],
                'filename': result['filename'],
                'total_records': result['total_records']
            })
        else:
            return jsonify({'success': False, 'error': 'Erro na exportação'}), 500
            
    except Exception as e:
        logging.error(f"Erro na exportação: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@embalagem_bp.route('/api/embalagem/export-custom', methods=['POST'])
def export_custom():
    """API para exportação customizada do card de exportação"""
    try:
        data = request.get_json()
        
        export_type = data.get('export_type', 'all')
        remessa = data.get('remessa', '')
        data_inicio = data.get('data_inicio', '')
        data_fim = data.get('data_fim', '')
        
        # Validações básicas
        if export_type == 'remessa' and not remessa:
            return jsonify({
                'success': False,
                'error': 'Remessa é obrigatória para este tipo de exportação'
            }), 400
        
        if export_type == 'date' and not (data_inicio or data_fim):
            return jsonify({
                'success': False,
                'error': 'Pelo menos uma data deve ser informada'
            }), 400
        
        # Processar exportação
        result = embalagem_service.export_custom_data(
            export_type=export_type,
            remessa=remessa,
            data_inicio=data_inicio,
            data_fim=data_fim
        )
        
        if result:
            return jsonify({
                'success': True,
                'download_url': result['download_url'],
                'filename': result['filename'],
                'total_records': result['total_records'],
                'message': f'Exportação concluída com sucesso! {result["total_records"]} registros exportados.'
            })
        else:
            return jsonify({
                'success': False,
                'error': 'Nenhum registro encontrado para os filtros especificados'
            }), 404
            
    except Exception as e:
        logging.error(f"Erro na exportação customizada: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500