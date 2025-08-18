"""
Manipulador de upload de planilhas
"""
import pandas as pd
from typing import List, Optional
import logging
from io import BytesIO

from models.embalagem import TempEmbalagem

class UploadHandler:
    def __init__(self):
        self.required_columns = [
            'Loja', 'Remessa', 'Local', 'Ordem', 'Posicao_Deposito',
            'Codigo', 'Descricao_Produto', 'UM', 'Qtde_Emb', 'Qtde_CX',
            'Qtde_UM', 'Estoque', 'EAN'
        ]
    
    def validate_file_format(self, file) -> bool:
        """Valida se o arquivo é uma planilha Excel válida"""
        try:
            filename = file.filename.lower()
            return filename.endswith(('.xlsx', '.xls'))
        except:
            return False
    
    def parse_excel_file(self, file) -> Optional[List[TempEmbalagem]]:
        """
        Faz o parse do arquivo Excel e retorna lista de objetos TempEmbalagem
        """
        try:
            # Ler arquivo Excel
            df = pd.read_excel(BytesIO(file.read()))
            
            # Validar colunas obrigatórias
            missing_columns = [col for col in self.required_columns if col not in df.columns]
            if missing_columns:
                logging.error(f"Colunas obrigatórias faltando: {missing_columns}")
                return None
            
            # Limpar dados e converter tipos
            df = df.dropna(subset=['Remessa', 'Loja', 'Codigo'])  # Remover linhas com valores obrigatórios nulos
            
            # Converter colunas numéricas para float (conforme estrutura da tabela)
            numeric_columns = ['Qtde_Emb', 'Qtde_CX', 'Qtde_UM', 'Estoque']
            for col in numeric_columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0.0)
            
            # Limpar e converter strings
            string_columns = ['Loja', 'Remessa', 'Local', 'Ordem', 'Posicao_Deposito', 
                            'Codigo', 'Descricao_Produto', 'UM']
            for col in string_columns:
                df[col] = df[col].astype(str).str.strip()
            
            # Tratar coluna EAN (pode ser nula)
            df['EAN'] = df['EAN'].astype(str)
            df['EAN'] = df['EAN'].replace('nan', None)
            df['EAN'] = df['EAN'].replace('', None)
            
            # Converter para objetos TempEmbalagem
            records = []
            for _, row in df.iterrows():
                try:
                    # Tratar EAN especialmente
                    ean_value = row['EAN']
                    if pd.isna(ean_value) or str(ean_value).lower() in ['nan', 'none', '']:
                        ean_value = None
                    else:
                        ean_value = str(ean_value)
                    
                    record = TempEmbalagem(
                        Loja=str(row['Loja']),
                        Remessa=str(row['Remessa']),
                        Local=str(row['Local']),
                        Ordem=str(row['Ordem']),
                        Posicao_Deposito=str(row['Posicao_Deposito']),
                        Codigo=str(row['Codigo']),
                        Descricao_Produto=str(row['Descricao_Produto']),
                        UM=str(row['UM']),
                        Qtde_Emb=float(row['Qtde_Emb']),
                        Qtde_CX=float(row['Qtde_CX']),
                        Qtde_UM=float(row['Qtde_UM']),
                        Estoque=float(row['Estoque']),
                        EAN=ean_value,
                        Status='Pendente',
                        Usuario=None  # Pode ser definido posteriormente se necessário
                    )
                    records.append(record)
                except Exception as e:
                    logging.warning(f"Erro ao processar linha: {e}")
                    logging.warning(f"Dados da linha: {row.to_dict()}")
                    continue
            
            logging.info(f"Arquivo processado: {len(records)} registros válidos")
            return records
            
        except Exception as e:
            logging.error(f"Erro ao processar arquivo Excel: {e}")
            return None

# Instância global do handler
upload_handler = UploadHandler()