"""
Aplicação Flask com estilo SAP Fiori
Módulos: Embalagem, Shelf Life, Configurações
"""

from flask import Flask, render_template, request, jsonify
import os

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-key-change-in-production')

# Configurações da aplicação
app.config['DEBUG'] = True
app.config['TEMPLATES_AUTO_RELOAD'] = True

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

@app.errorhandler(404)
def not_found_error(error):
    """Página de erro 404."""
    return render_template('base.html', title='Página não encontrada'), 404

@app.errorhandler(500)
def internal_error(error):
    """Página de erro 500."""
    return render_template('base.html', title='Erro interno'), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)