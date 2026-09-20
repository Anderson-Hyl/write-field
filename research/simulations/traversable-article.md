# 从一组解析结果开始理解 Traversable

> 2026-09-19 写作演练样稿，由助手生成，用来承载产品讨论；不是用户已经认可或准备发布的文章。范围有意收窄，尚未展开 laws 与自定义 Tree 实例。

假设我们收到几段文本，想把它们全部读成整数。单个字符串的解析结果可能是 `Just n`，也可能是 `Nothing`。先把解析函数映射到列表上，很自然：

```haskell
map (readMaybe :: String -> Maybe Int) ["12", "oops", "7"]
-- [Just 12,Nothing,Just 7]
```

这个结果回答了“每一项分别怎样”。但调用方也许问的是另一件事：这批输入能不能整体变成一份整数列表？如果可以，给我全部数字；只要有一个解析失败，就不给我这份列表。

```haskell
traverse (readMaybe :: String -> Maybe Int) ["12", "oops", "7"]
-- Nothing

traverse (readMaybe :: String -> Maybe Int) ["12", "8", "7"]
-- Just [12,8,7]
```

我想从这个需求差异开始理解 `Traversable`：我们不仅变换每个元素，还把元素产生的计算组合起来，得到包在计算中的结构。这里的 `t` 是列表，`f` 是 `Maybe`。

```haskell
traverse :: (Traversable t, Applicative f)
         => (a -> f b) -> t a -> f (t b)
```

但“有一个失败就整体失败”来自这里选用的 `Maybe`，不能当成所有 `traverse` 的定义。换一个 `Applicative`，组合的含义也会变。例如，让每个数字都提供正负两种选择：

```haskell
traverse (\x -> [x, -x]) [1, 2 :: Int]
-- [[1,2],[1,-2],[-1,2],[-1,-2]]
```

此时外层列表装着不同的选择结果。把“组合效应”一概说成“顺序执行 IO”，会让我们错过这个例子；把它一概说成“收集所有错误”，也会误读前面的 `Maybe` 例子。

这篇导读暂时只沿着一个问题走：当我已经会用 `fmap`，什么需求让我需要 `traverse`？接下来再用实例与定律限制这些直觉，避免把一个好记的比喻当成完整定义。

资料：[base 4.15.0.0 的 Data.Traversable 官方文档](https://hackage.haskell.org/package/base-4.15.0.0/docs/Data-Traversable.html)。代码输出另由本机 GHC 实测，见 [traversable-example.hs](traversable-example.hs)；运行几个输入不等于证明所有 Traversable laws。
