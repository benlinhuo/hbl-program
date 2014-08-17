function gcd(x, y, r)
{
    #返回整数x与y的最大公分母
    x = int(x)
    y = int(y)
    print x, y
    r = x % y
    return r == 0 ? y : gcd(y, r)
}

{g = gcd($1, $2); print "gcd(" $1, $2 ") =", g}
