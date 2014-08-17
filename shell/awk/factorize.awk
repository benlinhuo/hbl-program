#计算整数的因数分解，一行列出一个
#语法：awk -f factorize.awk
{
    n = int($1)
    m = n = (n >= 2) ? n : 2
    factors = ""
    for (k = 2;(m >1) && (k^2 <= n);) {
        if (m % k != 0 ) {
            k++
            continue
        }
        m /= k
        factors = (factors == "") ? ("" k) : (factors "*" k) 
    }
    if (m > 1 && m < n) {
        factors = factors "*" m
    }
    print n, (factors == "") ? "is Prime" : ("= " factors)
}

