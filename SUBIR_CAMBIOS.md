de windows a remote
rsync -avz --delete   -e "ssh -i ~/.ssh/ESP-ethical-phishing-ec2instance.pem"   /mnt/c/Users/ricar/repos/fescarcuddle/   admin@x1-x.com:/home/admin/frescarcaddle/

de remote a windows (menos usado)
rsync -avz --delete   -e "ssh -i ~/.ssh/ESP-ethical-phishing-ec2instance.pem"   admin@x1-x.com:/home/admin/frescarcaddle/   /mnt/c/Users/ricar/repos/fescarcuddle/