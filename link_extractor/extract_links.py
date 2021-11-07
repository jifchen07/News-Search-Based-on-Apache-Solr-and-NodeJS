import os
import json
import csv
import networkx as nx
import numpy, scipy
from bs4 import BeautifulSoup

folder_name = '../nytimes'
file_paths_file = 'files.json'
url_file_mapfile = 'url_file_map.json'
file_url_mapfile = 'file_url_map.json'
edges_file = 'edges.txt'
pagerank_file = 'external_pageRankFile.txt'
linux_prefix = '/home/jifchen07/solr/nytimes/'

if not os.path.exists(file_paths_file):
    # files = [os.path.join(folder_name, f) for f in os.listdir(folder_name)]
    files = [folder_name + '/' + f for f in os.listdir(folder_name)]
    with open(file_paths_file, 'w') as f:
        json.dump(files, f)
    print('List of file paths created')
else:
    with open(file_paths_file, 'r') as f:
        files = json.load(f)

if not os.path.exists(url_file_mapfile) or not os.path.exists(file_url_mapfile):
    url_to_file = {}
    with open('URLtoHTML_nytimes_news.csv') as f:
        reader = csv.reader(f, delimiter=',')
        next(reader)

        for row in reader:
            fn, url = row[0].strip(), row[1].strip()
            if url not in url_to_file:
                url_to_file[url] = fn

        file_to_url = {url_to_file[u]: u for u in url_to_file}

    with open(url_file_mapfile, 'w') as f:
        json.dump(url_to_file, f)
    with open(file_url_mapfile, 'w') as f:
        json.dump(file_to_url, f)

else:
    with open(url_file_mapfile, 'r') as f:
        url_to_file = json.load(f)
    with open(file_url_mapfile, 'r') as f:
        file_to_url = json.load(f)

'''
generate edges
'''
if not os.path.exists(edges_file):
    num_files = len(files)
    edge_set = set()

    for i, file in enumerate(files):
        with open(file, 'r', encoding='utf-8') as f:
            cur_node = file.split('/')[-1]
            html = f.read()
            soup = BeautifulSoup(html, 'html.parser')
            for link in soup.find_all('a'):
                url = link.get('href')
                if not url or not url.startswith('http') or url not in url_to_file:
                    continue
                # print(url)
                node = url_to_file[url]
                edge_set.add(f'{cur_node} {node}\n')

        print(f'{i + 1} / {num_files} processed')

    with open(edges_file, 'w') as f:
        f.writelines(edge_set)

'''
generate graph
'''
edges_file_path = os.path.abspath(edges_file)
graph = nx.read_edgelist(edges_file_path, create_using=nx.DiGraph())
print(f'graph created, number of nodes in graph: {graph.number_of_nodes()}')

'''
generate page rank file
'''
pr = nx.pagerank(graph,
                 alpha=0.85, personalization=None, max_iter=30, tol=1e-6, nstart=None, weight='weight', dangling=None)
with open(pagerank_file, 'w') as f:
    f.writelines(f'{linux_prefix}{n}={rank:.15f}\n' for n, rank in pr.items())
print('page rank file exported')