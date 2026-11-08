set -x
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36'
P='https://www.histdata.com/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/eurusd/2004'
curl -sS -A "$UA" -c jar -o page.html -w "%{http_code} %{size_download}\n" "$P"
grep -o '<form[^>]*file_down[^>]*>' page.html | head -2
grep -o '<input[^>]*>' page.html | grep -i 'tk\|date\|datemonth\|platform\|timeframe\|fxpair' | head -10
TK=$(grep -o 'id="tk" value="[^"]*"' page.html | sed 's/.*value="//;s/"//' | head -1)
echo "TK=$TK"
curl -sS -A "$UA" -b jar -e "$P" -X POST -d "tk=$TK&date=2004&datemonth=2004&platform=ASCII&timeframe=M1&fxpair=EURUSD" -o z.zip -w "%{http_code} %{size_download} %{content_type}\n" https://www.histdata.com/get.php
file z.zip; unzip -l z.zip | head; unzip -p z.zip '*.csv' | head -3
P2='https://www.histdata.com/download-free-forex-historical-data/?/ascii/1-minute-bar-quotes/xauusd/2010'
curl -sS -A "$UA" -c jar2 -o p2.html "$P2"; TK2=$(grep -o 'id="tk" value="[^"]*"' p2.html | sed 's/.*value="//;s/"//' | head -1)
curl -sS -A "$UA" -b jar2 -e "$P2" -X POST -d "tk=$TK2&date=2010&datemonth=2010&platform=ASCII&timeframe=M1&fxpair=XAUUSD" -o z2.zip -w "%{http_code} %{size_download}\n" https://www.histdata.com/get.php; unzip -p z2.zip '*.csv' | head -2
