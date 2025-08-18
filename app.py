"""
Aplicação Flask com estilo SAP Fiori
Módulos: Embalagem, Shelf Life, Configurações
"""

from flask import Flask, render_template, request, jsonify, send_from_directory
import os
import logging

# Configurar logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Configurações da aplicação
app.config['DEBUG'] = True
app.config['TEMPLATES_AUTO_RELOAD'] = True
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Criar diretório para exports
os.makedirs('data', exist_ok=True)
os.makedirs('static/exports', exist_ok=True)

# Importar e registrar blueprints
from routes.embalagem_routes import embalagem_bp
app.register_blueprint(embalagem_bp)

@app.route('/')
def index():
    """Página principal com cards dos módulos."""
    return render_template('index.html', title='Dashboard Principal')

@app.route('/embalagem')
def embalagem():
    """Módulo de Embalagem."""
    return render_template('embalagem.html', title='Embalagem')

@app.route('/shelf-life')
def shelf_life():
    """Módulo de Shelf Life."""
    return render_template('shelf_life.html', title='Shelf Life')

@app.route('/configuracoes')
def configuracoes():
    """Módulo de Configurações."""
    return render_template('configuracoes.html', title='Configurações')

@app.route('/api/theme', methods=['POST'])
def toggle_theme():
    """API endpoint para alternar tema."""
    data = request.get_json()
    theme = data.get('theme', 'light')
    return jsonify({'theme': theme, 'status': 'success'})

@app.route('/static/exports/<filename>')
def download_export(filename):
    """Endpoint para download de arquivos exportados"""
    try:
        return send_from_directory('data', filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': 'Arquivo não encontrado'}), 404

@app.errorhandler(404)
def not_found_error(error):
    """Página de erro 404."""
    return render_template('base.html', title='Página não encontrada'), 404

@app.errorhandler(500)
def internal_error(error):
    """Página de erro 500."""
    return render_template('base.html', title='Erro interno'), 500

@app.errorhandler(413)
def file_too_large(error):
    """Arquivo muito grande."""
    return jsonify({'success': False, 'error': 'Arquivo muito grande. Máximo 16MB'}), 413

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)