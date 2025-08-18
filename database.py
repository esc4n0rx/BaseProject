"""
Configuração e conexão com banco de dados MySQL
"""
import mysql.connector
from mysql.connector import Error
import os
from dotenv import load_dotenv
import logging

# Carregar variáveis de ambiente
load_dotenv()

class DatabaseConnection:
    def __init__(self):
        self.host = os.getenv('MYSQL_HOST')
        self.user = os.getenv('MYSQL_USER')
        self.password = os.getenv('MYSQL_PASSWORD')
        self.database = os.getenv('MYSQL_DB')
        self.connection = None
        
    def connect(self):
        """Estabelece conexão com o banco de dados"""
        try:
            self.connection = mysql.connector.connect(
                host=self.host,
                user=self.user,
                password=self.password,
                database=self.database,
                charset='utf8mb4',
                autocommit=True
            )
            if self.connection.is_connected():
                logging.info("Conexão com MySQL estabelecida com sucesso")
                return True
        except Error as e:
            logging.error(f"Erro ao conectar com MySQL: {e}")
            return False
        return False
    
    def disconnect(self):
        """Fecha a conexão com o banco de dados"""
        if self.connection and self.connection.is_connected():
            self.connection.close()
            logging.info("Conexão com MySQL fechada")
    
    def execute_query(self, query, params=None):
        """Executa uma query e retorna os resultados"""
        if not self.connection or not self.connection.is_connected():
            if not self.connect():
                return None
        
        try:
            cursor = self.connection.cursor(dictionary=True)
            cursor.execute(query, params)
            
            if query.strip().upper().startswith('SELECT'):
                result = cursor.fetchall()
            else:
                result = cursor.rowcount
                
            cursor.close()
            return result
        except Error as e:
            logging.error(f"Erro ao executar query: {e}")
            return None
    
    def execute_many(self, query, data_list):
        """Executa inserção em lote"""
        if not self.connection or not self.connection.is_connected():
            if not self.connect():
                return False
        
        try:
            cursor = self.connection.cursor()
            cursor.executemany(query, data_list)
            affected_rows = cursor.rowcount
            cursor.close()
            logging.info(f"Inserção em lote realizada: {affected_rows} registros")
            return True
        except Error as e:
            logging.error(f"Erro na inserção em lote: {e}")
            return False

# Instância global da conexão
db = DatabaseConnection()