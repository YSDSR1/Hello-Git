#include <stdio.h>
#include <cs50.h>
#include <stdlib.h>

int next(int a);

int main(void)
{
    int i = get_int("输入一个无符号整数 \n");
    srand(i);
    int d1 = 0; int d2 = 0;
  
    d1 = rand() % 6 + 1;
    d2 = rand() % 6 + 1;
    int sum = d1 + d2;
    printf("%i\n",sum);
    
    if(sum == 11 || sum == 7)
    {
        printf("第1轮 win\n");
        return 0;
    }   
    else if(sum == 2 || sum == 3 || sum == 12)
    {
        printf("第1轮 false\n");
        return 0;
    } 
    //第二轮及以后
    else 
        next(sum);
}
int next(int a)
{
    for(int n = 2 ;n != 99 ;n++ )
    {
        int s = a;
        int da1 = rand() % 6 + 1;
        int da2 = rand() % 6 + 1;
        a = da1 + da2;

        if(a == 7)
        {
            printf("第%i轮 false\n", n);
            return 0;
        }
        else if(s == a)
        {
            printf("第%i轮 win\n", n);
            return 0;
        }
    }
    return 1;
}
