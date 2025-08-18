"""
Serviços de negócio para o módulo de embalagem
"""
import json
import os
from datetime import datetime, date
from typing import List, Dict, Optional
import logging
import math

from database import db
from models.embalagem import TempEmbalagem, EmbalagemStats

class EmbalagemService:
    def __init__(self):
        self.duplicate_log_file = 'data/duplicate_keys.json'
        self._ensure_data_directory()
    
    def _ensure_data_directory(self):
        """Garante que o diretório data existe"""
        os.makedirs('data', exist_ok=True)
    
    def get_dashboard_stats(self) -> Optional[EmbalagemStats]:
        """Obtém estatísticas para o dashboard"""
        try:
            # Total de remessas únicas
            query_remessas = "SELECT COUNT(DISTINCT Remessa) as total FROM temp_embalagem"
            result_remessas = db.execute_query(query_remessas)
            total_remessas = result_remessas[0]['total'] if result_remessas else 0
            
            # Contagem por status
            query_status = """
                SELECT Status, COUNT(*) as count 
                FROM temp_embalagem 
                GROUP BY Status
            """
            result_status = db.execute_query(query_status)
            
            status_counts = {
                'Pendente': 0,
                'em_separacao': 0,
                'Finalizado': 0,
                'Faturado': 0
            }
            
            if result_status:
                for row in result_status:
                    if row['Status'] in status_counts:
                        status_counts[row['Status']] = row['count']
            
            # Cálculo do percentual de corte
            query_corte = """
                SELECT 
                    COUNT(*) as total_itens,
                    SUM(CASE WHEN Qtde_Emb = 0 AND Status IN ('Finalizado', 'Faturado') THEN 1 ELSE 0 END) as itens_com_corte
                FROM temp_embalagem
                WHERE Status IN ('Finalizado', 'Faturado')
            """
            result_corte = db.execute_query(query_corte)
            
            total_itens = 0
            itens_com_corte = 0
            percentual_corte = 0.0
            
            if result_corte and result_corte[0]['total_itens']:
                total_itens = result_corte[0]['total_itens']
                itens_com_corte = result_corte[0]['itens_com_corte'] or 0
                if total_itens > 0:
                    percentual_corte = round((itens_com_corte / total_itens) * 100, 2)
            
            return EmbalagemStats(
                total_remessas=total_remessas,
                pendentes=status_counts['Pendente'],
                em_separacao=status_counts['em_separacao'],
                finalizados=status_counts['Finalizado'],
                faturados=status_counts['Faturado'],
                percentual_corte=percentual_corte,
                total_itens=total_itens,
                itens_com_corte=itens_com_corte
            )
            
        except Exception as e:
            logging.error(f"Erro ao obter estatísticas: {e}")
            return None
    
    def _load_duplicate_keys(self) -> Dict:
        """Carrega chaves duplicadas do arquivo JSON"""
        if os.path.exists(self.duplicate_log_file):
            try:
                with open(self.duplicate_log_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logging.error(f"Erro ao carregar arquivo de duplicatas: {e}")
        return {}
    
    def _save_duplicate_keys(self, duplicate_keys: Dict):
        """Salva chaves duplicadas no arquivo JSON"""
        try:
            with open(self.duplicate_log_file, 'w', encoding='utf-8') as f:
                json.dump(duplicate_keys, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logging.error(f"Erro ao salvar arquivo de duplicatas: {e}")
    
    def validate_and_filter_duplicates(self, records: List[TempEmbalagem]) -> tuple[List[TempEmbalagem], List[str]]:
        """
        Valida e filtra registros duplicados baseado na chave composta
        Retorna: (registros_validos, chaves_duplicadas)
        """
        today = date.today().isoformat()
        duplicate_keys = self._load_duplicate_keys()
        
        # Limpar chaves de dias anteriores
        if today not in duplicate_keys:
            duplicate_keys = {today: []}
        else:
            # Manter apenas as chaves do dia atual
            duplicate_keys = {today: duplicate_keys.get(today, [])}
        
        valid_records = []
        duplicate_found = []
        today_keys = set(duplicate_keys[today])
        
        for record in records:
            unique_key = record.get_unique_key()
            
            if unique_key not in today_keys:
                valid_records.append(record)
                today_keys.add(unique_key)
                duplicate_keys[today].append(unique_key)
            else:
                duplicate_found.append(unique_key)
        
        # Salvar chaves atualizadas
        self._save_duplicate_keys(duplicate_keys)
        
        return valid_records, duplicate_found
    
    def insert_batch_records(self, records: List[TempEmbalagem]) -> bool:
        """Insere registros em lote no banco de dados"""
        if not records:
            return True
        
        # Query ajustada para a estrutura real da tabela
        insert_query = """
            INSERT INTO temp_embalagem 
            (Loja, Remessa, Local, Ordem, Posicao_Deposito, Codigo, 
             Descricao_Produto, UM, Qtde_Emb, Qtde_CX, Qtde_UM, 
             Estoque, EAN, Status, Usuario)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        data_list = [record.to_tuple() for record in records]
        return db.execute_many(insert_query, data_list)
    
    def process_upload(self, records: List[TempEmbalagem]) -> Dict:
        """
        Processa upload de registros
        Retorna resultado da operação
        """
        try:
            # Validar e filtrar duplicatas
            valid_records, duplicates = self.validate_and_filter_duplicates(records)
            
            # Inserir registros válidos
            success = False
            if valid_records:
                success = self.insert_batch_records(valid_records)
            else:
                success = True  # Não há registros para inserir
            
            return {
                'success': success,
                'total_received': len(records),
                'valid_records': len(valid_records),
                'duplicates_found': len(duplicates),
                'duplicate_keys': duplicates
            }
            
        except Exception as e:
            logging.error(f"Erro no processamento do upload: {e}")
            return {
                'success': False,
                'error': str(e),
                'total_received': len(records),
                'valid_records': 0,
                'duplicates_found': 0
            }
    
    def get_paginated_data(self, page: int, per_page: int, filters: Dict) -> Optional[Dict]:
        """Obtém dados paginados com filtros aplicados"""
        try:
            # Construir WHERE clause
            where_conditions = []
            params = []
            
            if filters.get('data_inicio'):
                where_conditions.append("DATE(Data_Registro) >= %s")
                params.append(filters['data_inicio'])
            
            if filters.get('data_fim'):
                where_conditions.append("DATE(Data_Registro) <= %s")
                params.append(filters['data_fim'])
            
            if filters.get('status'):
                where_conditions.append("Status = %s")
                params.append(filters['status'])
            
            if filters.get('remessa'):
                where_conditions.append("Remessa LIKE %s")
                params.append(f"%{filters['remessa']}%")
            
            if filters.get('loja'):
                where_conditions.append("Loja LIKE %s")
                params.append(f"%{filters['loja']}%")
            
            if filters.get('codigo'):
                where_conditions.append("Codigo LIKE %s")
                params.append(f"%{filters['codigo']}%")
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # Contar total de registros
            count_query = f"SELECT COUNT(*) as total FROM temp_embalagem{where_clause}"
            count_result = db.execute_query(count_query, params)
            total_records = count_result[0]['total'] if count_result else 0
            
            # Calcular paginação
            total_pages = math.ceil(total_records / per_page)
            offset = (page - 1) * per_page
            
            # Buscar dados paginados
            data_query = f"""
                SELECT id, Loja, Remessa, Local, Ordem, Posicao_Deposito, Codigo, 
                       Descricao_Produto, UM, Qtde_Emb, Qtde_CX, Qtde_UM, 
                       Estoque, EAN, Status, Usuario, Data_Registro
                FROM temp_embalagem
                {where_clause}
                ORDER BY Data_Registro DESC, id DESC
                LIMIT %s OFFSET %s
            """
            
            data_params = params + [per_page, offset]
            data_result = db.execute_query(data_query, data_params)
            
            # Formatar dados
            formatted_data = []
            if data_result:
                for row in data_result:
                    formatted_row = dict(row)
                    # Formatar data para display
                    if formatted_row['Data_Registro']:
                        formatted_row['Data_Registro_Formatted'] = formatted_row['Data_Registro'].strftime('%d/%m/%Y %H:%M')
                    formatted_data.append(formatted_row)
            
            return {
                'data': formatted_data,
                'current_page': page,
                'total_pages': total_pages,
                'total_records': total_records,
                'per_page': per_page,
                'has_next': page < total_pages,
                'has_prev': page > 1
            }
            
        except Exception as e:
            logging.error(f"Erro ao obter dados paginados: {e}")
            return None
    
    def get_record_by_id(self, record_id: int) -> Optional[Dict]:
        """Obtém um registro específico pelo ID"""
        try:
            query = """
                SELECT id, Loja, Remessa, Local, Ordem, Posicao_Deposito, Codigo, 
                       Descricao_Produto, UM, Qtde_Emb, Qtde_CX, Qtde_UM, 
                       Estoque, EAN, Status, Usuario, Data_Registro
                FROM temp_embalagem
                WHERE id = %s
            """
            
            result = db.execute_query(query, (record_id,))
            
            if result:
                record = dict(result[0])
                # Formatar data para display
                if record['Data_Registro']:
                    record['Data_Registro_Formatted'] = record['Data_Registro'].strftime('%d/%m/%Y %H:%M:%S')
                return record
            
            return None
            
        except Exception as e:
            logging.error(f"Erro ao obter registro por ID: {e}")
            return None
    
    def export_data(self, filters: Dict, export_format: str = 'excel') -> Optional[Dict]:
        """Exporta dados filtrados"""
        try:
            import pandas as pd
            from datetime import datetime
            
            # Construir WHERE clause (mesmo código da paginação)
            where_conditions = []
            params = []
            
            if filters.get('data_inicio'):
                where_conditions.append("DATE(Data_Registro) >= %s")
                params.append(filters['data_inicio'])
            
            if filters.get('data_fim'):
                where_conditions.append("DATE(Data_Registro) <= %s")
                params.append(filters['data_fim'])
            
            if filters.get('status'):
                where_conditions.append("Status = %s")
                params.append(filters['status'])
            
            if filters.get('remessa'):
                where_conditions.append("Remessa LIKE %s")
                params.append(f"%{filters['remessa']}%")
            
            if filters.get('loja'):
                where_conditions.append("Loja LIKE %s")
                params.append(f"%{filters['loja']}%")
            
            if filters.get('codigo'):
                where_conditions.append("Codigo LIKE %s")
                params.append(f"%{filters['codigo']}%")
            
            where_clause = " WHERE " + " AND ".join(where_conditions) if where_conditions else ""
            
            # Buscar todos os dados filtrados
            export_query = f"""
                SELECT id as ID, Loja, Remessa, Local, Ordem, Posicao_Deposito as 'Posição Depósito', 
                       Codigo as 'Código', Descricao_Produto as 'Descrição Produto', UM, 
                       Qtde_Emb as 'Qtde Embalagem', Qtde_CX as 'Qtde Caixa', Qtde_UM as 'Qtde UM', 
                       Estoque, EAN, Status, Usuario as 'Usuário', Data_Registro as 'Data Registro',
                       Total_Pallets as 'Total Pallets'
                FROM temp_embalagem
                {where_clause}
                ORDER BY Data_Registro DESC, id DESC
            """
            
            result = db.execute_query(export_query, params)
            
            if not result:
                return None
            
            # Converter para DataFrame
            df = pd.DataFrame(result)
            
            # Gerar nome do arquivo
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            
            if export_format == 'excel':
                filename = f"embalagem_export_{timestamp}.xlsx"
                filepath = os.path.join('data', filename)
                df.to_excel(filepath, index=False, engine='openpyxl')
            else:
                filename = f"embalagem_export_{timestamp}.csv"
                filepath = os.path.join('data', filename)
                df.to_csv(filepath, index=False, encoding='utf-8-sig')
            
            return {
                'download_url': f'/static/exports/{filename}',
                'filename': filename,
                'total_records': len(result),
                'filepath': filepath
            }
            
        except Exception as e:
            logging.error(f"Erro na exportação: {e}")
            return None

    def export_custom_data(self, export_type: str, remessa: str = None, data_inicio: str = None, data_fim: str = None) -> Optional[Dict]:
        """Exporta dados com filtros customizados do card de exportação"""
        try:
            import pandas as pd
            from datetime import datetime
            
            # Construir filtros baseado no tipo de exportação
            filters = {}
            
            if export_type == 'remessa' and remessa:
                filters['remessa'] = remessa
            elif export_type == 'date':
                if data_inicio:
                    filters['data_inicio'] = data_inicio
                if data_fim:
                    filters['data_fim'] = data_fim
            # Para 'all', não adiciona filtros
            
            # Reutilizar método existente
            return self.export_data(filters, 'excel')
            
        except Exception as e:
            logging.error(f"Erro na exportação customizada: {e}")
            return None

# Instância global do serviço
embalagem_service = EmbalagemService()