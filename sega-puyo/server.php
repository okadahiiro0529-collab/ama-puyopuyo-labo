<?php
  header("Content-type: application/json");
  
  // CREATE DATABASE IF NOT EXISTS `puyo` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT ENCRYPTION='N';
  // USE `puyo`;
  // CREATE TABLE `puyoServer` (
  //   `id` int NOT NULL AUTO_INCREMENT,
  //   `user1_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  //   `user2_code` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  //   `user1_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  //   `user2_name` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  //   `user1_batankyu` int NOT NULL DEFAULT '0',
  //   `user2_batankyu` int NOT NULL DEFAULT '0',
  //   `user1_puyosCount` int NOT NULL DEFAULT '0',
  //   `user2_puyosCount` int NOT NULL DEFAULT '0',
  //   `user1_board` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  //   `user2_board` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  //   `user1_attack` int NOT NULL DEFAULT '0',
  //   `user2_attack` int NOT NULL DEFAULT '0',
  //   PRIMARY KEY (`id`)
  // ) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

  $server = "mysql:host=localhost;dbname=puyo;charset=utf8mb4";
  try {
    $db_user = "webserver";
    $db_pass = "momiji";
    $DBH = new PDO($server, $db_user, $db_pass);
    $DBH->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $DBH->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);
  } catch (PDOException $e){
    echo('{}');
    exit;
  }
  function sqlInsert($table, $keys, $vals){
    global $DBH; $DBH->query("INSERT INTO $table($keys) VALUES($vals)");
  }
  function sqlSelect($table, $keys="*", $where="", $sort="", $limit="", $like=""){
    global $DBH; $like = explode(",", $like);
    $sql = "SELECT DISTINCT $keys FROM $table";
    if(!empty($where))    $sql .= " WHERE $where";
    if(!empty($sort))     $sql .= " ORDER BY $sort";
    if(!empty($limit))    $sql .= " LIMIT $limit";
    if(count($like) == 2) $sql .= " {$like[0]} LIKE '{$like[1]}%'";
    return $DBH->query($sql);
  }
  function sqlUpdate($table, $keys, $where=""){
    global $DBH; $sql = "UPDATE $table SET $keys";
    if(!empty($where)) $sql .= " WHERE $where"; $DBH->query($sql);
  }
  function sqlData($query) {
    return $data = $query->fetch(PDO::FETCH_ASSOC);
  }
  function safeStr($str) {
    $rep = str_replace(' ', '_', $str);
    $rep = str_replace('&', '&amp;', $rep);
    $rep = str_replace('"', '&quot;', $rep);
    $rep = str_replace('\'', '&apos;', $rep);
    $rep = str_replace('\\', '&#092;', $rep);
    $rep = str_replace('<', '&lt;', $rep);
    $rep = str_replace('>', '&gt;', $rep);
    return $rep;
  }
  $response = array();
  if (isset($_POST['userCode'])) {
    $userKey = 'user1';
    $userName = safeStr($_POST['userName']);
    $userCode = safeStr($_POST['userCode']);
    $absorbedDamage = intval($_POST['absorbedDamage']);
    $attack = intval($_POST['attack']) - $absorbedDamage;
    $beforeFetchAttack = intval($_POST['beforeFetchAttack']) - $absorbedDamage;
    $deltaAttack = $attack - $beforeFetchAttack;
    $beforeFetchDamage = intval($_POST['beforeFetchDamage']);
    $batankyu = intval($_POST['batankyu']);
    $puyosCount = intval($_POST['puyosCount']);
    $myBoard = safeStr($_POST['myBoard']);
    if (empty($userCode)) {
      do {
        $userCode = "";
        $cand = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for($i = 0; $i < 9; $i++){
          if($i == 3 || $i == 6 || $i == 9){
            $userCode .= "-";
          }
          $userCode .= substr($cand, mt_rand(0, 61), 1);
        }
        $user1count = sqlSelect('puyoServer', '*', "user1_code='{$userCode}'")->rowCount();
        $user2count = sqlSelect('puyoServer', '*', "user2_code='{$userCode}'")->rowCount();
      } while($user1count + $user2count > 0);
      $query = sqlSelect('puyoServer', '*', "user2_code is NULL and user1_batankyu=0 and user2_batankyu=0");
      if ($query->rowCount() == 0) {
        $userKey = 'user1';
        sqlInsert('puyoServer', 'id,user1_code,user1_name,user1_board', "0,'$userCode','$userName','$myBoard'");
      } else {
        $userKey = 'user2';
        $data = sqlData($query);
        sqlUpdate('puyoServer', "user2_code='$userCode',user2_name='$userName',user2_board='$myBoard'", "id={$data['id']}");
      }
    }
    $query = sqlSelect('puyoServer', '*', "user1_code='{$userCode}'");
    if ($query->rowCount()) {
      $data = sqlData($query);
      $response['userCode'] = $data['user1_code'];
      $response['userName'] = $data['user1_name'];
      $response['rivalCode'] = $data['user2_code'];
      $response['rivalName'] = $data['user2_name'];
      $deltaDamage = intval($data['user2_attack']) - $beforeFetchDamage;
      if ($deltaAttack > $deltaDamage) {
        $absorbedDamage = $absorbedDamage + $deltaDamage;
        $attack = $attack - $deltaDamage;
      } else {
        $absorbedDamage = $absorbedDamage + $deltaAttack;
        $attack = $attack - $deltaAttack;
      } 
      $response['absorbedDamage'] = $absorbedDamage;
      $response['damage'] = intval($data['user2_attack']) - $absorbedDamage;
      $response['rivalBatankyu'] = $data['user2_batankyu'];
      $response['rivalBoard'] = $data['user2_board'];
      sqlUpdate('puyoServer', "user1_batankyu=$batankyu,user1_puyosCount=$puyosCount,user1_board='$myBoard',user1_attack=$attack", "id={$data['id']}");
    } else {
      $query = sqlSelect('puyoServer', '*', "user2_code='{$userCode}'");
      if ($query->rowCount()) {
        $data = sqlData($query);
        $response['userCode'] = $data['user2_code'];
        $response['userName'] = $data['user2_name'];
        $response['rivalCode'] = $data['user1_code'];
        $response['rivalName'] = $data['user1_name'];
        $deltaDamage = intval($data['user1_attack']) - $beforeFetchDamage;
        if ($deltaAttack > $deltaDamage) {
          $absorbedDamage = $absorbedDamage + $deltaDamage;
          $attack = $attack - $deltaDamage;
        } else {
          $absorbedDamage = $absorbedDamage + $deltaAttack;
          $attack = $attack - $deltaAttack;
        }
        $response['absorbedDamage'] = $absorbedDamage;
        $response['damage'] = intval($data['user1_attack']) - $absorbedDamage;
        $response['rivalBatankyu'] = $data['user1_batankyu'];
        $response['rivalBoard'] = $data['user1_board'];
        sqlUpdate('puyoServer', "user2_batankyu=$batankyu,user2_puyosCount=$puyosCount,user2_board='$myBoard',user2_attack=$attack", "id={$data['id']}");
      }
    }
  }
  echo json_encode($response);
?>