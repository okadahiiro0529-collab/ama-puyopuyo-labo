<?php
// ai.php — improved logging for debugging ai_server input/output
// Backup your original ai.php before replacing.

header("Content-Type: application/json; charset=utf-8");

// Increase execution time for slow AI runs
set_time_limit(120);

// Read incoming request body (JSON snapshot from client)
$inputText = file_get_contents('php://input');

// Persist the raw input for debugging (append with timestamp)
$debugReqFile = __DIR__ . DIRECTORY_SEPARATOR . 'debug_ai_request.json';
@file_put_contents($debugReqFile, date("[Y-m-d H:i:s] ") . $inputText . PHP_EOL, FILE_APPEND);

// Path to the ai executable (assumes ai_server.exe is in the same directory).
$aiPath = __DIR__ . DIRECTORY_SEPARATOR . 'ai_server.exe';

// Prepare proc_open descriptors
$descriptors = [
  0 => ["pipe", "r"],  // stdin
  1 => ["pipe", "w"],  // stdout
  2 => ["pipe", "w"]   // stderr
];

// Try to start the AI process (use full path and quote)
$cmd = '"' . $aiPath . '"';
$proc = @proc_open($cmd, $descriptors, $pipes, __DIR__);

if (!is_resource($proc)) {
  http_response_code(500);
  $err = ['error' => 'failed to start ai_server', 'aiPath' => $aiPath];
  echo json_encode($err);
  @file_put_contents(__DIR__ . DIRECTORY_SEPARATOR . 'ai_err.txt', date("[Y-m-d H:i:s] ") . "proc_open failed for: $cmd" . PHP_EOL, FILE_APPEND);
  exit;
}

// send input to ai_server stdin
fwrite($pipes[0], $inputText);
fclose($pipes[0]);

// read stdout and stderr (blocking until process ends)
$stdout = stream_get_contents($pipes[1]);
fclose($pipes[1]);
$stderr = stream_get_contents($pipes[2]);
fclose($pipes[2]);

$ret = proc_close($proc);

// Save stdout and stderr for inspection
@file_put_contents(__DIR__ . DIRECTORY_SEPARATOR . 'ai_out.txt', date("[Y-m-d H:i:s] ") . $stdout . PHP_EOL, FILE_APPEND);
if (strlen(trim($stderr)) > 0) {
  @file_put_contents(__DIR__ . DIRECTORY_SEPARATOR . 'ai_err.txt', date("[Y-m-d H:i:s] ") . $stderr . PHP_EOL, FILE_APPEND);
}

// Try to parse stdout as JSON
$resp = json_decode($stdout, true);
if (!is_array($resp)) {
  // return raw stdout/stderr for debugging
  http_response_code(500);
  echo json_encode(['_raw' => substr($stdout,0,20000), '_stderr' => substr($stderr,0,20000), 'ret' => $ret]);
  exit;
}

// If AI didn't provide pair/used, try to infer from incoming snapshot (optional fallback)
if (!isset($resp['pair'])) {
  $inputJson = json_decode($inputText, true);
  if (isset($inputJson['self']['current']) && is_array($inputJson['self']['current'])) {
    $resp['pair'] = $inputJson['self']['current'];
    $resp['used'] = ['type' => 'current'];
  } elseif (isset($inputJson['self']['queue'][0]) && is_array($inputJson['self']['queue'][0])) {
    $resp['pair'] = $inputJson['self']['queue'][0];
    $resp['used'] = ['type' => 'next', 'index' => 0];
  }
}

// Return AI JSON
header('Content-Type: application/json; charset=utf-8');
echo json_encode($resp);
exit;
?>