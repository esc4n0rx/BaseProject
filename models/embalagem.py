"""
Modelo para a tabela temp_embalagem
"""
from dataclasses import dataclass
from typing import Optional
from datetime import datetime
import json

@dataclass
class TempEmbalagem:
    """Modelo da tabela temp_embalagem"""
    Loja: str
    Remessa: str
    Local: str
    Ordem: str
    Posicao_Deposito: str
    Codigo: str
    Descricao_Produto: str
    UM: str
    Qtde_Emb: float
    Qtde_CX: float
    Qtde_UM: float
    Estoque: float
    EAN: Optional[str] = None
    Status: str = 'Pendente'
    Usuario: Optional[str] = None
    Data_Registro: Optional[str] = None
    id: Optional[int] = None
    
    def __post_init__(self):
        if self.Data_Registro is None:
            self.Data_Registro = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        # Garantir que EAN seja string ou None
        if self.EAN is not None:
            self.EAN = str(self.EAN)
    
    def get_unique_key(self):
        """Gera chave única para validação de duplicidade"""
        return f"{self.Remessa}+{self.Loja}+{self.Codigo}+{self.Qtde_Emb}"
    
    def to_dict(self):
        """Converte para dicionário"""
        return {
            'Loja': self.Loja,
            'Remessa': self.Remessa,
            'Local': self.Local,
            'Ordem': self.Ordem,
            'Posicao_Deposito': self.Posicao_Deposito,
            'Codigo': self.Codigo,
            'Descricao_Produto': self.Descricao_Produto,
            'UM': self.UM,
            'Qtde_Emb': self.Qtde_Emb,
            'Qtde_CX': self.Qtde_CX,
            'Qtde_UM': self.Qtde_UM,
            'Estoque': self.Estoque,
            'EAN': self.EAN,
            'Status': self.Status,
            'Usuario': self.Usuario,
            'Data_Registro': self.Data_Registro
        }
    
    def to_tuple(self):
        """Converte para tupla para inserção no banco"""
        return (
            self.Loja, self.Remessa, self.Local, self.Ordem,
            self.Posicao_Deposito, self.Codigo, self.Descricao_Produto,
            self.UM, self.Qtde_Emb, self.Qtde_CX, self.Qtde_UM,
            self.Estoque, self.EAN, self.Status, self.Usuario
        )

@dataclass
class EmbalagemStats:
    """Estatísticas do módulo de embalagem"""
    total_remessas: int
    pendentes: int
    em_separacao: int
    finalizados: int
    faturados: int
    percentual_corte: float
    total_itens: int
    itens_com_corte: int