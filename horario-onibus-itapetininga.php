<?php
/**
 * Plugin Name: Horário Ônibus Itapetininga
 * Plugin URI: https://github.com/alphamontanari/horario-onibus-itapetininga
 * Description: Linhas de Ônibus Itapetininga
 * Version: 1.3.3.0
 * Author: André Luiz Montanari
 * Author URI: https://github.com/alphamontanari
 * License: GPLv3
 *
 * GitHub Plugin URI: alphamontanari/horario-onibus-itapetininga
 * Primary Branch: main
 */



if (!defined('ABSPATH')) {
  exit;
}

/** Caminhos internos */
define('HOR_ITAPE_DIR', plugin_dir_path(__FILE__));
define('HOR_ITAPE_ASSETS_DIR', trailingslashit(HOR_ITAPE_DIR . 'assets'));

/** Regras de rota: página e assets */
add_action('init', function () {
  add_rewrite_tag('%hor_itape%', '([0-1])');
  add_rewrite_tag('%hor_itape_asset%', '(.+)');

  add_rewrite_rule('^horario-onibus-itapetininga/?$', 'index.php?hor_itape=1', 'top');
  add_rewrite_rule('^horario-onibus-itapetininga/(.+)$', 'index.php?hor_itape=1&hor_itape_asset=$matches[1]', 'top');
});

register_activation_hook(__FILE__, function () {
  do_action('init');
  flush_rewrite_rules();
});
register_deactivation_hook(__FILE__, function () {
  flush_rewrite_rules();
});

/** MIME simples */
function hor_itape_mime($ext)
{
  $map = [
    'css' => 'text/css; charset=UTF-8',
    'js' => 'application/javascript; charset=UTF-8',
    'json' => 'application/json; charset=UTF-8',
    'png' => 'image/png',
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'gif' => 'image/gif',
    'svg' => 'image/svg+xml',
    'webp' => 'image/webp',
    'html' => 'text/html; charset=UTF-8',
    'woff' => 'font/woff',
    'woff2' => 'font/woff2',
    'ttf' => 'font/ttf',
    'otf' => 'font/otf',
    'map' => 'application/json; charset=UTF-8'
  ];
  $ext = strtolower((string) $ext);
  return $map[$ext] ?? 'application/octet-stream';
}

/** Servir assets pela rota limpa */
function hor_itape_serve_asset($rel_path)
{
  $clean = ltrim((string) $rel_path, '/');
  if (strpos($clean, 'assets/') === 0)
    $clean = substr($clean, 7);

  $base = realpath(HOR_ITAPE_ASSETS_DIR);
  $file = realpath(HOR_ITAPE_ASSETS_DIR . $clean);

  if (!$base || !$file || !is_file($file) || strpos($file, $base) !== 0) {
    status_header(404);
    exit;
  }

  $ext = pathinfo($file, PATHINFO_EXTENSION);
  header('Content-Type: ' . hor_itape_mime($ext));
  header('Cache-Control: public, max-age=300');
  readfile($file);
  exit;
}

/** Página + assets */
add_action('template_redirect', function () {
  if ((int) get_query_var('hor_itape') !== 1)
    return;

  // Proxy de assets
  $asset = get_query_var('hor_itape_asset');
  if (!empty($asset))
    hor_itape_serve_asset($asset);

  // Coleta dinâmica dos arquivos de linha
  $linhas_dir = HOR_ITAPE_ASSETS_DIR . 'linhas';
  $linhas_files = [];
  $linhas_vars = [];
  if (is_dir($linhas_dir)) {
    $files = glob($linhas_dir . '/*.js') ?: [];
    natsort($files);
    foreach ($files as $full) {
      $base = basename($full);                  // ex.: linha01A.js
      $name = preg_replace('/\.js$/i', '', $base);// ex.: linha01A
      // normaliza: linhaXX -> LinhaXX (só a 1ª letra)
      $var = preg_replace('/^linha/', 'Linha', $name);
      $linhas_files[] = [
        'url' => home_url('/horario-onibus-itapetininga/linhas/' . $base),
        'var' => $var
      ];
      $linhas_vars[] = $var;
    }
  }

  status_header(200);
  nocache_headers();
  header('Content-Type: text/html; charset=' . get_bloginfo('charset'), true);
  ?>
  <!DOCTYPE html>
  <html lang="pt-BR">

  <head>
    <meta charset="<?php echo esc_attr(get_bloginfo('charset')); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Linhas de Ônibus de Itapetininga</title>
    <link rel="stylesheet" href="style.css">
  </head>

  <body>
    <!-- Não para site da prefeitura
    <button id="copyLinkBtn" class="fab-copy" type="button" aria-label="Copiar link">
      🔗 <span class="label">Copiar endereço</span>
    </button>
    <span id="copyLinkHint" class="copy-hint" role="status" aria-live="polite"></span>
     -->

    <div class="wrap">
      <div id="crumbs" class="crumbs" aria-live="polite"></div>
      <div id="app"></div>
    </div>

    <!-- IMPORTAR DADOS DE LINHAS (dinâmico) -->
    <?php foreach ($linhas_files as $f): ?>
      <script src="<?php echo esc_url($f['url']); ?>"></script>
    <?php endforeach; ?>

    <!-- CRIAR BD DE LINHAS (dinâmico, compatível com const/let/var) -->
    <script>
      const LINHAS = {};
      <?php foreach ($linhas_vars as $v): ?>
        try { if (typeof <?php echo $v; ?> !== 'undefined') LINHAS.<?php echo $v; ?> = <?php echo $v; ?>; } catch (e) { }
      <?php endforeach; ?>
      // console.log(LINHAS);
    </script>

    <!-- FUNÇÃO COMPARTILHAR URL -->
    <script>
        (function () {
          const btn = document.getElementById('copyLinkBtn');
          const hint = document.getElementById('copyLinkHint');

          async function copy(text) {
            // Clipboard API (HTTPS/localhost)
            if (navigator.clipboard && window.isSecureContext) {
              await navigator.clipboard.writeText(text);
              return true;
            }
            // Fallback (funciona em + navegadores)
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.setAttribute('readonly', '');
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand('copy');
            document.body.removeChild(ta);
            if (!ok) throw new Error('copy fallback falhou');
            return true;
          }

          async function onCopyClick() {
            const url = window.location.href;           // pega o URL no momento do clique
            try {
              await copy(url);
              hint.textContent = 'Link copiado!';
            } catch {
              hint.textContent = 'Não foi possível copiar';
            }
            // feedback rápido (você estiliza depois)
            clearTimeout(onCopyClick._t);
            onCopyClick._t = setTimeout(() => hint.textContent = '', 1500);
          }

          btn.addEventListener('click', onCopyClick);
        })();
    </script>

    <!-- FUNÇÕES PRINCIPAIS -->
    <script src="main.js"></script>


  </body>

  </html>
  <?php
  exit;
});
